import type { AchievementDefinition, ClueDefinition, DiscoveryDefinition, ItemDefinition, ItemId } from "./types";

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

export const DISCOVERIES: DiscoveryDefinition[] = [
  { id: "dandelion", icon: "✣", title: "晚风蒲公英", note: "绒球朝河谷方向飘，风并不总从高处来。" },
  { id: "frog", icon: "♩", title: "河岸树蛙", note: "它只在水流平稳时鸣叫，是一枚自然的水位计。" },
  { id: "snail", icon: "◉", title: "石墙蜗牛", note: "它花了很久爬过一块石砖，但并没有迟到。" },
  { id: "butterfly", icon: "蝶", title: "蜜色凤蝶", note: "花田恢复以后，它会把蜂场也重新唤醒。" },
  { id: "cloudview", icon: "云", title: "山顶云影", note: "停在这里时，云的影子正好越过整条河。" },
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { id: "wayfinder", icon: "⇧", title: "认路的人", description: "读懂桥边的旧路标。" },
  { id: "slow_afternoon", icon: "⌛", title: "不赶路的下午", description: "在长椅上认真坐一会儿。" },
  { id: "field_notes", icon: "✎", title: "花谷见习生", description: "记录三种自然发现。" },
  { id: "naturalist", icon: "✿", title: "花谷观察家", description: "记录全部五种自然发现。" },
  { id: "wind_reader", icon: "⌁", title: "听懂风的人", description: "用丝带让阵风变得可读。" },
  { id: "kindness", icon: "♥", title: "最后一口水", description: "把水留给枯萎的小花。" },
  { id: "hive_keeper", icon: "六", title: "蜂场守护者", description: "让沉睡的蜂场重新热闹起来。" },
  { id: "remembered_day", icon: "生", title: "今天，被记住", description: "完成春日花谷的主线。" },
  { id: "unhurried_day", icon: "★", title: "没有错过沿途", description: "完成主线和全部三件今日小事。" },
];
