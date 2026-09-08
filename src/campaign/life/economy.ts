import { ITEMS, PETS, LOOT_TABLES, MAX_COINS, MAX_STACK, MAX_OWNED_PETS, MAX_EQUIPPED_PETS, itemById, petById, type ItemEffect, type PetSpecies } from "./catalog";
import type { LootTableId } from "./schema";

export interface OwnedPet { id: string; species: PetSpecies; name: string }
export interface EconomyState {
  version: 1; seed: number; coins: number; inventory: Record<string, number>;
  claimed: string[]; pets: OwnedPet[]; equipped: string[]; nextPet: number;
  stats: { collected: number; sold: number; spent: number; used: number };
}
export interface EconomyResult {
  ok: boolean; message: string;
  rewards?: { id: string; title: string; quantity: number }[];
  effect?: ItemEffect;
}
export interface EconomyView {
  coins: number; maxStack: number; ownedLimit: number; equippedLimit: number;
  items: { id: string; title: string; icon: string; description: string; count: number; sellPrice: number; usable: boolean }[];
  shop: { id: string; title: string; icon: string; description: string; price: number; owned: number; canBuy: boolean; disabledReason: string }[];
  pets: (OwnedPet & { equipped: boolean; canEquip: boolean; disabledReason: string })[];
  equipped: OwnedPet[];
  petShop: { id: PetSpecies; title: string; icon: string; description: string; price: number; owned: number; canBuy: boolean; disabledReason: string }[];
  achievements: { id: string; title: string; current: number; target: number; done: boolean }[];
}

const DEFAULT_SEED = 0x8da150;
const MAX_CLAIMS = 20000;
const own = (value: unknown, key: string): unknown => value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, key) ? (value as Record<string, unknown>)[key] : undefined;
const integer = (n: unknown, max: number, fallback = 0) => typeof n === "number" && Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : fallback;
const claimValid = (key: unknown): key is string => typeof key === "string" && key.length <= 120 && /^[a-z0-9][a-z0-9:_-]*$/i.test(key);
const amountValid = (quantity: number) => Number.isSafeInteger(quantity) && quantity > 0 && quantity <= MAX_STACK;
const fail = (message: string): EconomyResult => ({ ok: false, message });

export function createEconomy(seed = DEFAULT_SEED): EconomyState {
  return { version: 1, seed: integer(seed, 0xffffffff, DEFAULT_SEED), coins: 24, inventory: { "trail-snack": 2 }, claimed: [], pets: [], equipped: [], nextPet: 1, stats: { collected: 0, sold: 0, spent: 0, used: 0 } };
}

/** Whitelist fields, IDs, finite integers and bounded collections. Never trust names/prices in a save. */
export function restoreEconomy(input: unknown): EconomyState {
  if (!input || typeof input !== "object" || Array.isArray(input)) return createEconomy();
  const state = createEconomy(integer(own(input, "seed"), 0xffffffff, DEFAULT_SEED));
  state.coins = integer(own(input, "coins"), MAX_COINS);
  state.inventory = {};
  for (const item of ITEMS) {
    const count = integer(own(own(input, "inventory"), item.id), MAX_STACK);
    if (count) state.inventory[item.id] = count;
  }
  const claimed = own(input, "claimed");
  state.claimed = Array.isArray(claimed) ? [...new Set(claimed.filter(claimValid))].slice(0, MAX_CLAIMS) : [];
  const pets = own(input, "pets");
  for (const pet of Array.isArray(pets) ? pets.slice(0, 100) : []) {
    const id = own(pet, "id"), species = own(pet, "species");
    const definition = typeof species === "string" ? petById(species) : undefined;
    if (!definition || typeof id !== "string" || !/^pet-[1-9][0-9]{0,6}$/.test(id) || state.pets.some(p => p.id === id) || state.pets.length >= MAX_OWNED_PETS) continue;
    state.pets.push({ id, species: definition.id, name: `${definition.title} · ${id.slice(4)}` });
  }
  state.nextPet = Math.max(0, ...state.pets.map(p => Number(p.id.slice(4)))) + 1;
  const equipped = own(input, "equipped");
  state.equipped = Array.isArray(equipped) ? [...new Set(equipped.filter((id): id is string => typeof id === "string" && state.pets.some(p => p.id === id)))].slice(0, MAX_EQUIPPED_PETS) : [];
  for (const key of ["collected", "sold", "spent", "used"] as const) state.stats[key] = integer(own(own(input, "stats"), key), MAX_COINS);
  return state;
}

/** Transactions accept only an already restored state; malformed input fails without mutation. */
function stateValid(state: EconomyState) {
  if (!state || state.version !== 1 || !Number.isSafeInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff || !Number.isSafeInteger(state.coins) || state.coins < 0 || state.coins > MAX_COINS) return false;
  if (!state.inventory || typeof state.inventory !== "object" || Array.isArray(state.inventory) || !Object.entries(state.inventory).every(([id, count]) => itemById(id) && Number.isSafeInteger(count) && count >= 0 && count <= MAX_STACK)) return false;
  if (!Array.isArray(state.claimed) || state.claimed.length > MAX_CLAIMS || !state.claimed.every(claimValid) || new Set(state.claimed).size !== state.claimed.length) return false;
  if (!Array.isArray(state.pets) || state.pets.length > MAX_OWNED_PETS || !state.pets.every(p => p && typeof p === "object" && petById(p.species) && typeof p.id === "string" && /^pet-[1-9][0-9]{0,6}$/.test(p.id)) || new Set(state.pets.map(p => p.id)).size !== state.pets.length) return false;
  if (!Array.isArray(state.equipped) || state.equipped.length > MAX_EQUIPPED_PETS || new Set(state.equipped).size !== state.equipped.length || !state.equipped.every(id => state.pets.some(p => p.id === id))) return false;
  return Number.isSafeInteger(state.nextPet) && state.nextPet > 0 && state.nextPet <= 10000000 && Boolean(state.stats) && ["collected", "sold", "spent", "used"].every(key => { const n = state.stats[key as keyof EconomyState["stats"]]; return Number.isSafeInteger(n) && n >= 0 && n <= MAX_COINS; });
}

/** FNV-derived deterministic roll: reload cannot alter a node+round's result. */
function randomFor(seed: number, key: string) {
  let value = (seed ^ 2166136261) >>> 0;
  for (const character of key) value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  return () => { value = (value + 0x6d2b79f5) >>> 0; let t = Math.imul(value ^ value >>> 15, 1 | value); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

export function loot(state: EconomyState, table: LootTableId, claimKey: string): EconomyResult {
  if (!stateValid(state)) return fail("背包数据需要重新读取，未领取物资。");
  if (!Object.prototype.hasOwnProperty.call(LOOT_TABLES, table) || !claimValid(claimKey)) return fail("这处物资记录无效。");
  if (state.claimed.includes(claimKey)) return fail("这一份已经收过了，不会重复获得物资。");
  if (state.claimed.length >= MAX_CLAIMS) return fail("生活记录已满；现有物资仍可使用和兑换。");
  const random = randomFor(state.seed, `${table}:${claimKey}`), pool = LOOT_TABLES[table];
  let weight = random() * pool.reduce((sum, row) => sum + row.weight, 0), selected = pool[pool.length - 1];
  for (const row of pool) { weight -= row.weight; if (weight < 0) { selected = row; break; } }
  const quantity = selected.min + Math.floor(random() * (selected.max - selected.min + 1));
  const coins = 2 + Math.floor(random() * 4);
  if ((state.inventory[selected.id] ?? 0) + quantity > MAX_STACK) return fail(`${itemById(selected.id)!.title}已接近堆叠上限 ${MAX_STACK}，请先出售或使用后再收。`);
  if (state.coins + coins > MAX_COINS) return fail("金币已接近上限，请先兑换后再收。");
  state.inventory[selected.id] = (state.inventory[selected.id] ?? 0) + quantity;
  state.coins += coins; state.claimed.push(claimKey); state.stats.collected = Math.min(MAX_COINS, state.stats.collected + quantity);
  const title = itemById(selected.id)!.title;
  return { ok: true, message: `收好 ${title} ×${quantity}、金币 +${coins}。`, rewards: [{ id: selected.id, title, quantity }, { id: "coin", title: "金币", quantity: coins }] };
}

export function sellItem(state: EconomyState, id: string, quantity = 1): EconomyResult {
  if (!stateValid(state)) return fail("背包数据无效，未执行兑换。");
  const item = itemById(id);
  if (!item || !amountValid(quantity)) return fail("请选择有效物品与正整数数量。");
  if ((state.inventory[id] ?? 0) < quantity) return fail("背包数量不足，不能出售。");
  const amount = item.sellPrice * quantity;
  if (state.coins + amount > MAX_COINS) return fail("金币将超过上限，请减少数量。");
  state.inventory[id] -= quantity; if (!state.inventory[id]) delete state.inventory[id];
  state.coins += amount; state.stats.sold = Math.min(MAX_COINS, state.stats.sold + quantity);
  return { ok: true, message: `交回 ${item.title} ×${quantity}，获得 ${amount} 金币。` };
}

export function buyItem(state: EconomyState, id: string, quantity = 1): EconomyResult {
  if (!stateValid(state)) return fail("背包数据无效，未执行兑换。");
  const item = itemById(id);
  if (!item?.buyPrice || !amountValid(quantity)) return fail("这件物品不在补给站售卖，或数量无效。");
  const price = item.buyPrice * quantity;
  if (state.coins < price) return fail(`金币不足，需要 ${price}，现有 ${state.coins}。`);
  if ((state.inventory[id] ?? 0) + quantity > MAX_STACK) return fail(`这件物品最多堆叠 ${MAX_STACK} 份。`);
  state.coins -= price; state.inventory[id] = (state.inventory[id] ?? 0) + quantity;
  state.stats.spent = Math.min(MAX_COINS, state.stats.spent + price);
  return { ok: true, message: `已兑换 ${item.title} ×${quantity}。` };
}

export function useItem(state: EconomyState, id: string): EconomyResult {
  if (!stateValid(state)) return fail("背包数据无效，未使用物品。");
  const item = itemById(id);
  if (!item?.effect) return fail("这是可兑换的材料，不是可直接使用的补给。");
  if (!(state.inventory[id] > 0)) return fail("背包里已经没有这件补给。");
  if (item.effect.kind === "pet-call" && !state.equipped.length) return fail("请先在伙伴页安排至少一只出战伙伴，零食没有消耗。");
  state.inventory[id]--; if (!state.inventory[id]) delete state.inventory[id];
  state.stats.used = Math.min(MAX_COINS, state.stats.used + 1);
  return { ok: true, message: `使用了${item.title}：${item.description}`, effect: { ...item.effect } };
}

export function buyPet(state: EconomyState, speciesId: string): EconomyResult {
  if (!stateValid(state)) return fail("伙伴记录无效，未执行兑换。");
  const definition = petById(speciesId);
  if (!definition) return fail("不存在这种伙伴。");
  if (state.pets.length >= MAX_OWNED_PETS) return fail(`最多照顾 ${MAX_OWNED_PETS} 只伙伴；已有伙伴可以轮换出战。`);
  if (state.coins < definition.price) return fail(`领养需要 ${definition.price} 金币，现有 ${state.coins}。`);
  if (state.nextPet > 9999999 || state.pets.some(p => p.id === `pet-${state.nextPet}`)) return fail("伙伴编号需要重新整理，未扣金币。");
  const pet = { id: `pet-${state.nextPet}`, species: definition.id, name: `${definition.title} · ${state.nextPet}` };
  state.coins -= definition.price; state.pets.push(pet); state.nextPet++;
  state.stats.spent = Math.min(MAX_COINS, state.stats.spent + definition.price);
  // Explicit deployment prevents a purchase from silently changing the player's party.
  return { ok: true, message: `${pet.name}加入伙伴册；点击“出战”让它跟随。` };
}

export function equipPet(state: EconomyState, id: string, equip: boolean): EconomyResult {
  if (!stateValid(state) || typeof equip !== "boolean") return fail("伙伴操作无效。");
  const pet = state.pets.find(p => p.id === id);
  if (!pet) return fail("你尚未拥有这位伙伴。");
  const isEquipped = state.equipped.includes(id);
  if (isEquipped === equip) return fail(equip ? "这位伙伴已经出战。" : "这位伙伴已经在休息。");
  if (equip && state.equipped.length >= MAX_EQUIPPED_PETS) return fail(`最多 ${MAX_EQUIPPED_PETS} 只同时跟随，请先让一位休息。`);
  state.equipped = equip ? [...state.equipped, id] : state.equipped.filter(ownedId => ownedId !== id);
  return { ok: true, message: equip ? `${pet.name}准备跟随你。` : `${pet.name}回伙伴册休息。` };
}

export function economyView(state: EconomyState): EconomyView {
  const safe = restoreEconomy(state);
  const equipped = safe.equipped.map(id => ({ ...safe.pets.find(p => p.id === id)! }));
  return { coins: safe.coins, maxStack: MAX_STACK, ownedLimit: MAX_OWNED_PETS, equippedLimit: MAX_EQUIPPED_PETS,
    items: ITEMS.filter(item => (safe.inventory[item.id] ?? 0) > 0).map(item => ({ id: item.id, title: item.title, icon: item.icon, description: item.description, count: safe.inventory[item.id], sellPrice: item.sellPrice, usable: Boolean(item.effect) })),
    shop: ITEMS.filter(item => item.buyPrice).map(item => {
      const owned = safe.inventory[item.id] ?? 0, disabledReason = owned >= MAX_STACK ? "堆叠已满" : safe.coins < item.buyPrice! ? `还差 ${item.buyPrice! - safe.coins} 金币` : "";
      return { id: item.id, title: item.title, icon: item.icon, description: item.description, price: item.buyPrice!, owned, canBuy: !disabledReason, disabledReason };
    }),
    pets: safe.pets.map(pet => ({ ...pet, equipped: safe.equipped.includes(pet.id), canEquip: safe.equipped.includes(pet.id) || equipped.length < MAX_EQUIPPED_PETS, disabledReason: !safe.equipped.includes(pet.id) && equipped.length >= MAX_EQUIPPED_PETS ? "跟随位置已满，请先让一位休息" : "" })), equipped,
    petShop: PETS.map(pet => {
      const disabledReason = safe.pets.length >= MAX_OWNED_PETS ? `已照顾 ${MAX_OWNED_PETS} 只，拥有位置已满` : safe.coins < pet.price ? `还差 ${pet.price - safe.coins} 金币` : "";
      return { ...pet, owned: safe.pets.filter(p => p.species === pet.id).length, canBuy: !disabledReason, disabledReason };
    }),
    achievements: [
      { id: "life-supplies", title: "把零碎收成生活", current: safe.stats.collected, target: 30 },
      { id: "life-recycle", title: "让物资继续旅行", current: safe.stats.sold, target: 20 },
      { id: "life-prepare", title: "出发前的一点准备", current: safe.stats.used, target: 5 },
      { id: "life-company", title: "一路都有同伴", current: safe.pets.length, target: 3 },
    ].map(a => ({ ...a, current: Math.min(a.current, a.target), done: a.current >= a.target })),
  };
}
