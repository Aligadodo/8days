import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSource } from "./load-source.mjs";
const E = loadSource("src/campaign/life/economy.ts");
const C = loadSource("src/campaign/life/catalog.ts");
const clone = value => JSON.parse(JSON.stringify(value));
const rich = () => { const state = E.createEconomy(15); state.coins = 10000; return state; };
function failsUnchanged(state, callback) { const before = structuredClone(state); const result = callback(); assert.equal(result.ok, false, result.message); assert.deepEqual(state, before, "failed transaction must not mutate any field"); return result; }

test("catalog: all 12 pools have valid IDs and prices never allow profitable buy-resell", () => {
  assert.equal(Object.keys(C.LOOT_TABLES).length, 12);
  assert.equal(new Set(C.ITEMS.map(item => item.id)).size, C.ITEMS.length);
  for (const item of C.ITEMS) { assert.ok(Number.isInteger(item.sellPrice) && item.sellPrice > 0); if (item.buyPrice) assert.ok(item.buyPrice > item.sellPrice); }
  for (const pool of Object.values(C.LOOT_TABLES)) for (const row of pool) { assert.ok(C.itemById(row.id)); assert.ok(row.weight > 0); assert.ok(Number.isInteger(row.min) && row.min > 0 && row.max >= row.min); }
});

for (const table of Object.keys(C.LOOT_TABLES)) test(`loot ${table}: deterministic seed+node+round, bounded items, one-time across reload`, () => {
  const state = E.createEconomy(381), same = E.createEconomy(381), key = `d01-life-${table}:0`;
  const result = E.loot(state, table, key);
  assert.equal(result.ok, true);
  assert.deepEqual(E.loot(same, table, key), result);
  assert.deepEqual(state, same);
  for (const reward of result.rewards) if (reward.id !== "coin") { assert.ok(C.LOOT_TABLES[table].some(row => row.id === reward.id && reward.quantity >= row.min && reward.quantity <= row.max)); }
  const saved = E.restoreEconomy(clone(state));
  failsUnchanged(saved, () => E.loot(saved, table, key));
  failsUnchanged(saved, () => E.loot(saved, "salvage", key));
  assert.equal(E.loot(saved, table, `d01-life-${table}:1`).ok, true);
  assert.equal(saved.claimed.length, 2);
});

test("specific pools never put fruit in herb pots, stones in paper drawers, or fruit in kettles", () => {
  const expected = { cloth:"fiber", herbs:"herb", fruit:"fruit", stone:"stone", wood:"wood", paper:"paper", tea:"warm-tea" };
  for (const [table, id] of Object.entries(expected)) for (let seed = 0; seed < 100; seed++) {
    const result = E.loot(E.createEconomy(seed), table, `d01-life-${table}:0`);
    assert.equal(result.rewards[0].id, id);
  }
});

test("loot invalid key/table/full stack/full coin cap refuses atomically and can retry same fixed reward", () => {
  const state = rich();
  for (const key of ["", "../escape", "__proto__", "x".repeat(121), null, 5]) failsUnchanged(state, () => E.loot(state,"wood",key));
  for (const table of ["unknown", "__proto__", "constructor", null]) failsUnchanged(state, () => E.loot(state,table,"d01-life-box:0"));
  state.inventory.wood = C.MAX_STACK;
  failsUnchanged(state, () => E.loot(state,"wood","d01-life-box:0"));
  assert.equal(E.sellItem(state,"wood",10).ok,true);
  assert.equal(E.loot(state,"wood","d01-life-box:0").ok,true);
  state.coins = C.MAX_COINS;
  failsUnchanged(state, () => E.loot(state,"wood","d01-life-box:1"));
});

test("transactions reject invalid IDs/quantity/NaN and never touch protected main quest items", () => {
  const state = rich(); state.inventory.wood = 10;
  for (const quantity of [0,-1,1.5,NaN,Infinity,"1",1000]) {
    failsUnchanged(state, () => E.buyItem(state,"trail-snack",quantity));
    failsUnchanged(state, () => E.sellItem(state,"wood",quantity));
  }
  for (const id of ["__proto__","mill","小锤","paper-crane","coin","toString"]) {
    failsUnchanged(state, () => E.buyItem(state,id));
    failsUnchanged(state, () => E.sellItem(state,id));
    failsUnchanged(state, () => E.useItem(state,id));
  }
  failsUnchanged(state, () => E.useItem(state,"wood"));
});

test("stacked sell, buy, use conserve integer balances and cannot overdraw with repeated clicks", () => {
  const state = E.createEconomy(); state.inventory.wood = 8;
  assert.equal(E.sellItem(state,"wood",5).ok,true); assert.equal(state.inventory.wood,3); assert.equal(state.coins,39);
  assert.equal(E.buyItem(state,"trail-snack",3).ok,true); assert.equal(state.inventory["trail-snack"],5); assert.equal(state.coins,3);
  failsUnchanged(state, () => E.buyItem(state,"trail-snack"));
  assert.equal(E.useItem(state,"trail-snack").ok,true); assert.equal(state.inventory["trail-snack"],4);
  assert.equal(E.sellItem(state,"wood",3).ok,true); assert.ok(!("wood" in state.inventory));
  failsUnchanged(state, () => E.sellItem(state,"wood"));
  assert.ok(state.stats.collected===0 && state.stats.sold===8 && state.stats.spent===36 && state.stats.used===1);
});

test("shop caps fail before coins/inventory mutate and round-trip trading always loses coins", () => {
  const state=rich(); state.inventory["trail-snack"]=C.MAX_STACK;
  failsUnchanged(state,()=>E.buyItem(state,"trail-snack"));
  state.coins=C.MAX_COINS;
  failsUnchanged(state,()=>E.sellItem(state,"trail-snack"));
  for (const item of C.ITEMS.filter(i=>i.buyPrice)) { const s=rich(), before=s.coins; assert.equal(E.buyItem(s,item.id,10).ok,true); assert.equal(E.sellItem(s,item.id,10).ok,true); assert.ok(s.coins<before); }
});

test("consumables expose real, bounded, distinct runtime effects; no healing or invincibility", () => {
  const state=rich(); E.buyItem(state,"warm-tea"); E.buyItem(state,"pet-treat");
  assert.deepEqual(E.useItem(state,"warm-tea").effect,{kind:"pace",seconds:20,multiplier:1.08});
  assert.deepEqual(E.useItem(state,"trail-snack").effect,{kind:"pace",seconds:30,multiplier:1.12});
  failsUnchanged(state,()=>E.useItem(state,"pet-treat"));
  E.buyPet(state,"cat"); E.equipPet(state,state.pets[0].id,true);
  assert.deepEqual(E.useItem(state,"pet-treat").effect,{kind:"pet-call",seconds:45});
  assert.ok(!("pet-treat" in state.inventory)); failsUnchanged(state,()=>E.useItem(state,"pet-treat"));
});

test("pets: repeated species own unique identities, deployment explicit, three active/twelve owned limits", () => {
  const state=rich();
  for(let i=0;i<12;i++) assert.equal(E.buyPet(state,"cat").ok,true);
  assert.equal(state.pets.length,12); assert.equal(new Set(state.pets.map(p=>p.id)).size,12); assert.deepEqual(state.equipped,[]);
  failsUnchanged(state,()=>E.buyPet(state,"dog"));
  for(let i=0;i<3;i++) assert.equal(E.equipPet(state,state.pets[i].id,true).ok,true);
  failsUnchanged(state,()=>E.equipPet(state,state.pets[3].id,true));
  failsUnchanged(state,()=>E.equipPet(state,state.pets[0].id,true));
  assert.equal(E.equipPet(state,state.pets[0].id,false).ok,true);
  assert.equal(E.equipPet(state,state.pets[3].id,true).ok,true);
  assert.deepEqual(E.restoreEconomy(clone(state)),state);
});

test("pet transactions cannot buy unknown species, equip foreign IDs or overspend", () => {
  const state=E.createEconomy();
  failsUnchanged(state,()=>E.buyPet(state,"cat"));
  failsUnchanged(state,()=>E.buyPet(state,"dragon"));
  failsUnchanged(state,()=>E.equipPet(state,"pet-1",true));
  state.coins=100; E.buyPet(state,"mouse");
  failsUnchanged(state,()=>E.equipPet(state,"pet-1","true"));
  E.equipPet(state,"pet-1",true); E.equipPet(state,"pet-1",false);
  failsUnchanged(state,()=>E.equipPet(state,"pet-1",false));
});

test("restoration whitelists IDs, numbers, pet identity and equipped members, with detached safe views", () => {
  const input = JSON.parse('{"seed":null,"coins":"9999","inventory":{"wood":-7,"stone":1.9,"fiber":999999,"crystal":null,"__proto__":{"polluted":true},"mill":77},"pets":[{"id":"pet-8","species":"cat","name":"<img src=x>"},{"id":"pet-8","species":"dog"},{"id":"pet-9","species":"dragon"},null],"equipped":["pet-8","pet-8","pet-9"],"claimed":["d01-life-box:0","d01-life-box:0","../hack"],"stats":{"used":-1,"spent":"100"}}');
  input.inventory.crystal=Infinity;
  const state=E.restoreEconomy(input);
  assert.deepEqual(state.inventory,{stone:1,fiber:999}); assert.equal(state.coins,0); assert.equal(state.nextPet,9);
  assert.deepEqual(state.equipped,["pet-8"]); assert.equal(state.pets.length,1); assert.ok(!state.pets[0].name.includes("<"));
  assert.deepEqual(state.claimed,["d01-life-box:0"]); assert.equal({}.polluted,undefined);
  const view=E.economyView(state); view.equipped[0].name="changed"; assert.notEqual(state.pets[0].name,"changed");
  assert.equal(E.createEconomy().coins,24); assert.deepEqual(E.restoreEconomy(undefined),E.createEconomy());
});

test("malformed states fail without throwing or accidental free grants", () => {
  for(const patch of [{coins:NaN},{coins:Infinity},{pets:[null]},{equipped:["pet-1"]},{stats:{collected:-1,sold:0,spent:0,used:0}},{inventory:{constructor:99}}]) {
    const state={...E.createEconomy(),...patch};
    failsUnchanged(state,()=>E.buyItem(state,"trail-snack"));
    failsUnchanged(state,()=>E.loot(state,"wood","d01-life-test:0"));
  }
});

test("achievement progress persists and first-day initial supplies can afford first companion without renewal", () => {
  const state=E.createEconomy();
  for(let i=0;i<8;i++) assert.equal(E.loot(state,"paper",`d01-life-initial-${i}:0`).ok,true);
  assert.equal(E.sellItem(state,"paper",state.inventory.paper).ok,true);
  assert.ok(state.coins>=45,"even low-price paper plus first finds affords mouse");
  assert.equal(E.buyPet(state,"mouse").ok,true);
  const before=E.economyView(state).achievements;
  assert.deepEqual(E.economyView(E.restoreEconomy(clone(state))).achievements,before);
  assert.equal(before.find(a=>a.id==="life-company").current,1);
});

test("UI contract: five direct destinations preserve memories, atomic methods and visible reasons", () => {
  const source=readFileSync("src/main.ts","utf8"), css=readFileSync("src/style.css","utf8");
  for(const tab of ["inventory","shop","companions","achievements","more"]) assert.ok(source.includes(`data-tab="${tab}"`));
  for(const method of ["sellItem","buyItem","useItem","buyPet","equipPet"]) assert.ok(source.includes(`game.${method}(`));
  assert.ok(source.includes('id="inventoryGrid"')&&source.includes('id="economyFeedback"')&&source.includes("aria-describedby"));
  assert.ok(source.includes("drawer.inert = true")&&source.includes("drawer.inert = false"));
  assert.ok(css.includes(".trade-button:disabled")&&css.includes("@media (max-width: 480px)"));
  assert.ok(source.includes('class="supply-grid"') && source.includes('class="backpack-rules"') && !source.includes("真实堆叠背包"));
  assert.ok(source.includes('id="drawerTitle">随身背包') && css.includes("grid-template-columns: repeat(3,minmax(0,1fr))"));
});
