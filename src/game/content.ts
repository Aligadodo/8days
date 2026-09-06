import type { ClueDefinition, ItemDefinition, ItemId } from "./types";

export const WORLD = { width: 1600, height: 960 } as const;
// A closer logical camera makes the character and scene props readable, while
// Game.ts renders this view to a 2x backing buffer for a crisp final image.
export const VIEWPORT = { width: 800, height: 450 } as const;
export const PASSCODE = "3142";

export const ITEM_ORDER: ItemId[] = ["journal", "ribbon", "trowel", "water", "key"];

export const ITEMS: Record<ItemId, ItemDefinition> = {
  journal: {
    id: "journal",
    name: "花草图鉴",
    icon: "▤",
    description: "记录遇见的花、口令和这一天值得记住的事。",
  },
  ribbon: {
    id: "ribbon",
    name: "红丝带",
    icon: "⌁",
    description: "系在风向杆上，可以更清楚地判断阵风。",
  },
  trowel: {
    id: "trowel",
    name: "小铲",
    icon: "♠",
    description: "清理松软泥土和被堵塞的山路。",
  },
  water: {
    id: "water",
    name: "水壶",
    icon: "◒",
    description: "还剩一点干净的水，也许有小花更需要它。",
  },
  key: {
    id: "key",
    name: "黄铜钥匙",
    icon: "⚿",
    description: "从重新盛开的花丛里找到的小屋钥匙。",
  },
};

export const CLUES: ClueDefinition[] = [
  {
    id: 0,
    icon: "水磨坊",
    title: "旧磨坊门牌",
    digit: "3",
    memory: "水声让人想起，小时候的下午总比现在漫长。",
  },
  {
    id: 1,
    icon: "野餐布",
    title: "一人份便笺",
    digit: "1",
    memory: "一个人的野餐，也可以认真摆好杯子和面包。",
  },
  {
    id: 2,
    icon: "明信片",
    title: "四月明信片",
    digit: "4",
    memory: "寄信的人写道：花开的时候，不要只顾着赶路。",
  },
  {
    id: 3,
    icon: "小屋",
    title: "山顶门牌",
    digit: "2",
    memory: "门口一直留着两双拖鞋，一双给回家的人。",
  },
];
