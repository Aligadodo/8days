import type { LootTableId } from "./schema";

export type PetSpecies = "cat" | "dog" | "mouse";
export type ItemEffect = { kind: "pace" | "pet-call"; seconds: number; multiplier?: number };
export interface ItemDefinition {
  id: string; title: string; icon: string; description: string;
  sellPrice: number; buyPrice?: number; effect?: ItemEffect;
}
export const MAX_STACK = 999;
export const MAX_COINS = 999999;
export const MAX_OWNED_PETS = 12;
export const MAX_EQUIPPED_PETS = 3;
export const ITEMS: readonly ItemDefinition[] = [
  { id: "wood", title: "旧木料", icon: "▱", description: "公共修补箱里的可回收木料，可交给补给站换金币。", sellPrice: 3 },
  { id: "stone", title: "平滑石料", icon: "⬡", description: "路边或共享样品中取一份的石料，可兑换补给。", sellPrice: 2 },
  { id: "fiber", title: "植物纤维", icon: "≋", description: "落枝、芦穗和修补物中整理的纤维，不采光活植株。", sellPrice: 3 },
  { id: "herb", title: "芳香草叶", icon: "❧", description: "共享花盆和允许采集处的少量草叶，可交补给站整理。", sellPrice: 5 },
  { id: "crystal", title: "矿晶碎粒", icon: "◇", description: "公开取样盒中的矿物碎粒，不包含主线共鸣水晶。", sellPrice: 9 },
  { id: "fruit", title: "当季果实", icon: "●", description: "共享果篮中分出的一小份果实，可售卖换实用补给。", sellPrice: 4 },
  { id: "paper", title: "回收纸页", icon: "▤", description: "共享废纸盒中可再用的纸页，不包含私人的密封信或任务线索。", sellPrice: 2 },
  { id: "warm-tea", title: "一杯温茶", icon: "茶", description: "使用后 20 秒行走速度提高 8%。只缓解赶路感，不回血、不免伤。", sellPrice: 2, buyPrice: 8, effect: { kind: "pace", seconds: 20, multiplier: 1.08 } },
  { id: "trail-snack", title: "步行点心", icon: "▰", description: "使用后 30 秒行走速度提高 12%。不免伤，也不会替你避开危险。", sellPrice: 3, buyPrice: 12, effect: { kind: "pace", seconds: 30, multiplier: 1.12 } },
  { id: "pet-treat", title: "伙伴小零食", icon: "♥", description: "使用后 45 秒让出战伙伴靠近跟随；不自动拾取，不绕过地形或危险。", sellPrice: 2, buyPrice: 8, effect: { kind: "pet-call", seconds: 45 } },
];
export const PETS: readonly { id: PetSpecies; title: string; icon: string; price: number; description: string }[] = [
  { id: "cat", title: "橘子小猫", icon: "猫", price: 60, description: "安静的同路者，在身后地面轻轻跟随。" },
  { id: "dog", title: "麦芽小狗", icon: "犬", price: 70, description: "短腿但认真，会沿安全地面追上你的脚步。" },
  { id: "mouse", title: "芝麻小鼠", icon: "鼠", price: 45, description: "小小的探索伙伴，不钻墙、不搬走任务物品。" },
];
/** Fixed weighted pools; only the selection/quantity is seeded, never real-money loot. */
export const LOOT_TABLES: Record<LootTableId, readonly { id: string; weight: number; min: number; max: number }[]> = {
  cloth: [{ id: "fiber", weight: 1, min: 1, max: 3 }],
  herbs: [{ id: "herb", weight: 1, min: 1, max: 2 }],
  fruit: [{ id: "fruit", weight: 1, min: 1, max: 3 }],
  stone: [{ id: "stone", weight: 1, min: 1, max: 3 }],
  wood: [{ id: "wood", weight: 1, min: 1, max: 3 }],
  paper: [{ id: "paper", weight: 1, min: 1, max: 3 }],
  tea: [{ id: "warm-tea", weight: 1, min: 1, max: 1 }],
  salvage: [{ id: "wood", weight: 5, min: 1, max: 3 }, { id: "stone", weight: 3, min: 1, max: 3 }, { id: "fiber", weight: 3, min: 1, max: 2 }],
  nature: [{ id: "fiber", weight: 4, min: 1, max: 3 }, { id: "herb", weight: 4, min: 1, max: 2 }, { id: "fruit", weight: 2, min: 1, max: 2 }],
  pantry: [{ id: "fruit", weight: 6, min: 1, max: 3 }, { id: "herb", weight: 2, min: 1, max: 2 }, { id: "trail-snack", weight: 1, min: 1, max: 1 }],
  mineral: [{ id: "stone", weight: 6, min: 1, max: 3 }, { id: "crystal", weight: 3, min: 1, max: 2 }],
  pocket: [{ id: "fiber", weight: 3, min: 1, max: 2 }, { id: "wood", weight: 3, min: 1, max: 2 }, { id: "pet-treat", weight: 2, min: 1, max: 1 }, { id: "trail-snack", weight: 1, min: 1, max: 1 }],
};
export const itemById = (id: string) => ITEMS.find(item => item.id === id);
export const petById = (id: string) => PETS.find(pet => pet.id === id);
