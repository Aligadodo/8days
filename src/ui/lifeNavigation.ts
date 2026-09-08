export type DrawerDestination = "inventory" | "shop" | "companions" | "achievements" | "more" | "memories" | "journal" | "save" | "settings";
export type AchievementFilter = "all" | "pending" | "done";
export function drawerRoute(destination: DrawerDestination) {
  const routes = {
    inventory: { top: "inventory", panel: "inventory", lifeTab: "supplies", title: "随身背包" },
    shop: { top: "shop", panel: "inventory", lifeTab: "exchange", title: "旅行商店" },
    companions: { top: "companions", panel: "inventory", lifeTab: "pets", title: "同行伙伴" },
    achievements: { top: "achievements", panel: "achievements", lifeTab: null, title: "旅行成就" },
    more: { top: "more", panel: "more", lifeTab: null, title: "更多旅程记录" },
    memories: { top: "more", panel: "inventory", lifeTab: "memories", title: "任务线索与收藏" },
    journal: { top: "more", panel: "journal", lifeTab: null, title: "生活日志" },
    save: { top: "more", panel: "save", lifeTab: null, title: "旅程存档" },
    settings: { top: "more", panel: "settings", lifeTab: null, title: "旅程设置" },
  } as const;
  return routes[destination] ?? routes.inventory;
}
export interface AchievementCard { id: string; title: string; condition: string; scope: string; current: number; target: number; done: boolean }
const globalConditions: Record<string, string> = {
  "life-supplies": "累计收集 30 份生活物资（不含初始赠品）",
  "life-recycle": "在背包累计出售 20 份物资",
  "life-prepare": "累计使用 5 份温茶、点心或伙伴零食",
  "life-company": "拥有 3 位独立伙伴（可以是同一物种）",
};
export function achievementCards(global: { id:string;title:string;current:number;target:number;done:boolean }[], local: {id:string;title:string;description:string;current?:number;target?:number;done:boolean}[], day: number): AchievementCard[] {
  return [
    ...global.map(a=>({ ...a, scope:"八日累计",condition:globalConditions[a.id] ?? `完成 ${a.target} 次对应活动` })),
    ...local.map(a=>({id:a.id,title:a.title,condition:a.description,scope:`DAY ${day} 地方成就`,current:a.current ?? (a.done?1:0),target:a.target ?? 1,done:a.done})),
  ].map(a=>({ ...a,target:Math.max(1,a.target),current:Math.max(0,Math.min(a.current,Math.max(1,a.target))) }));
}
export function filterAchievements(cards: AchievementCard[], filter: AchievementFilter) { return cards.filter(a=>filter==="all" || (filter==="done"?a.done:!a.done)); }
export function showLifeGuide(dismissed: boolean, blocked: boolean) { return !dismissed && !blocked; }

/** A hidden/replaced focus target starts at the correct edge, including Shift+Tab. */
export function nextDrawerFocusIndex(current: number, count: number, reverse = false) {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return reverse ? count - 1 : 0;
  return (current + (reverse ? -1 : 1) + count) % count;
}
export function transactionFocusKeys(previous: string, destination: DrawerDestination, selectedSupply: string): string[] {
  const keys = [previous];
  if (previous.startsWith("equip-")) keys.push(previous.replace(/^equip-/,"rest-"));
  if (previous.startsWith("rest-")) keys.push(previous.replace(/^rest-/,"equip-"));
  if (destination === "inventory") keys.push(`supply-${selectedSupply}`);
  keys.push(`tab:${drawerRoute(destination).top}`);
  return keys;
}
export interface UiRectangle { left: number; right: number; top: number; bottom: number }
/** Keep the guide above horizontally overlapping UI, measured after actual wrapping/collapse. */
export function lifeGuideBottom(frame: UiRectangle, guide: UiRectangle, blockers: UiRectangle[], base = 76, gap = 8) {
  return Math.ceil(blockers.reduce((bottom, blocker) => guide.left < blocker.right && guide.right > blocker.left && blocker.bottom > blocker.top
    ? Math.max(bottom,frame.bottom-blocker.top+gap) : bottom,base));
}
