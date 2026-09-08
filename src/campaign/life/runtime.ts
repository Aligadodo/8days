import type { LifeNode } from "./schema";
import { loot, type EconomyState } from "./economy";

export interface LifeState {
  /** Advances only through active, visible gameplay. Never use Date.now for resource renewal. */
  activeSeconds: number;
  containers: string[];
  gathered: Record<string, { readyAt: number; cycle: number }>;
  effects: { paceUntil: number; paceMultiplier: number; petCallUntil: number };
}
export const createLife = (): LifeState => ({ activeSeconds:0, containers:[], gathered:{},
  effects:{paceUntil:0, paceMultiplier:1, petCallUntil:0} });
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const bounded = (value: unknown, max = 1_000_000_000) => typeof value === "number" && Number.isFinite(value) ? Math.max(0,Math.min(max,value)) : 0;
// v0.16: these authored public supplies changed from once-only drawers to renewable stock.
// Keep their old claims as history and start one full active-time cooldown, never grant on upgrade.
const RENEWED_CONTAINER_IDS=new Set(["d05-life-desk-right-drawer","d08-life-right-tin"]);
export function restoreLife(value: unknown, nodes: LifeNode[]): LifeState {
  const input=record(value), state=createLife(); state.activeSeconds=bounded(input.activeSeconds);
  const ids=new Set(nodes.filter(n=>n.kind==="container" || n.kind==="gather" && RENEWED_CONTAINER_IDS.has(n.id)).map(n=>n.id));
  state.containers=Array.isArray(input.containers) ? [...new Set(input.containers.filter((id): id is string => typeof id==="string" && ids.has(id)))] : [];
  const gathered=record(input.gathered);
  for(const node of nodes.filter(n=>n.kind==="gather")) {
    const previous=record(gathered[node.id]);
    if(Object.keys(previous).length) state.gathered[node.id]={
      readyAt:Math.min(bounded(previous.readyAt),state.activeSeconds+Math.max(180,node.renewSeconds??180)),
      cycle:Math.floor(bounded(previous.cycle,1_000_000)),
    };
    else if(RENEWED_CONTAINER_IDS.has(node.id) && state.containers.includes(node.id))state.gathered[node.id]={
      readyAt:state.activeSeconds+Math.max(180,node.renewSeconds??420),cycle:0,
    };
  }
  const effects=record(input.effects);
  state.effects={paceUntil:Math.min(bounded(effects.paceUntil),state.activeSeconds+300),
    paceMultiplier:Math.max(1,Math.min(1.12,bounded(effects.paceMultiplier,1.12))),
    petCallUntil:Math.min(bounded(effects.petCallUntil),state.activeSeconds+300)};
  return state;
}
export function lifeAvailable(state: LifeState,node: LifeNode) {
  return node.kind==="inspect" || (node.kind==="container" ? !state.containers.includes(node.id)
    : (state.gathered[node.id]?.readyAt??0)<=state.activeSeconds);
}
export function lifeRemainingSeconds(state:LifeState,node:LifeNode) {
  return Math.max(0,Math.ceil((state.gathered[node.id]?.readyAt??0)-state.activeSeconds-1e-7));
}
/** Loot and lifecycle mutation are one synchronous transaction; only successful grants consume a source. */
export function collectLife(state: LifeState,economy: EconomyState,node: LifeNode) {
  if(node.kind==="inspect") return {status:"inspect" as const,message:node.description};
  if(!lifeAvailable(state,node)) return {status:"empty" as const,
    message:node.kind==="gather" ? `${node.emptyText} 再活跃探索 ${lifeRemainingSeconds(state,node)} 秒后可以再收集；暂停和离线不计时。` : node.emptyText};
  if(!node.lootTable) return {status:"blocked" as const,message:"这里暂时没有可领取的共享物资。"};
  const cycle=state.gathered[node.id]?.cycle??0;
  const result=loot(economy,node.lootTable,node.kind==="container" ? `container:${node.id}` : `gather:${node.id}:${cycle}`);
  if(!result.ok) return {status:"blocked" as const,message:result.message};
  if(node.kind==="container")state.containers.push(node.id);
  else state.gathered[node.id]={readyAt:state.activeSeconds+Math.max(180,node.renewSeconds??180),cycle:cycle+1};
  return {status:"new" as const,message:result.message,rewards:result.rewards};
}
