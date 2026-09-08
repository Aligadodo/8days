import { distance, type Navigation } from "../navigation";
import type { Point } from "../types";
import { LOOT_TABLES, itemById } from "./catalog";
import { lifeAvailable, lifeRemainingSeconds, type LifeState } from "./runtime";
import type { LifeNode } from "./schema";

export interface SupplyRecommendation {
  id:string; title:string; expectedLoot:string; distance:number; distanceLabel:string; status:"可打开"|"可采集";
}
export interface SupplyView {
  total:number; ready:number; claimedContainers:number; coolingGather:number; unknown:number;
  earliestRenewSeconds:number|null; recommendations:SupplyRecommendation[];
  reason:string; canFind:boolean; roomSuggestion?:string;
}
export interface OpportunityContext {
  nodes:LifeNode[]; state:LifeState; player:Point; nav:Pick<Navigation,"route"|"visible"|"isWalkable">;
  seen:(point:Point)=>boolean; permitted:(node:LifeNode)=>boolean; dangerous:(point:Point)=>boolean;
  roomSuggestion?:string;
}
export function expectedLoot(node:LifeNode) {
  const rows=node.lootTable ? LOOT_TABLES[node.lootTable] : undefined;
  const names=[...new Set((rows??[]).map(row=>itemById(row.id)?.title).filter((name):name is string=>Boolean(name)))];
  return names.length ? `${names.join(" / ")} + 金币` : "不产出物资";
}
export function lifeHoverText(node:LifeNode,state:LifeState,permitted=true) {
  const remaining=lifeRemainingSeconds(state,node);
  const action=node.kind==="inspect"?"观察":!lifeAvailable(state,node)?node.kind==="container"?"已取空":`再来 ${remaining} 秒`
    :!permitted?"先完成原物件调查条件":node.kind==="container"?"打开":"采集";
  return {action,loot:node.kind==="inspect"?"不产出物资 · 可反复观察":expectedLoot(node)};
}
export function isKnownSupply(node:LifeNode,context:OpportunityContext) {
  return context.seen(node.position)||context.seen(node.approach)
    ||(distance(context.player,node.approach)<=205 && context.nav.visible(context.player,node.approach));
}
/** Exact safe route only: an opportunity is never snapped through a wall or into a danger margin. */
export function supplyRoute(node:LifeNode,context:OpportunityContext):Point[] {
  if(node.kind==="inspect" || !lifeAvailable(context.state,node) || !context.permitted(node)
    || !isKnownSupply(node,context) || !context.nav.isWalkable(node.approach)
    || context.dangerous(node.approach) || context.dangerous(context.player))return [];
  const route=context.nav.route(context.player,node.approach,context.dangerous,0);
  if(!route.length || distance(route.at(-1)!,node.approach)>.01)return [];
  if(route.some((point,i)=>!context.nav.visible(i?route[i-1]:context.player,point,context.dangerous)))return [];
  return route;
}
export function supplyOpportunities(context:OpportunityContext,cachedRecommendations?:SupplyRecommendation[]):SupplyView {
  const resources=context.nodes.filter(node=>node.kind!=="inspect" && node.lootTable);
  const claimedContainers=resources.filter(node=>node.kind==="container"&&!lifeAvailable(context.state,node)).length;
  const cooling=resources.filter(node=>node.kind==="gather"&&!lifeAvailable(context.state,node));
  const ready=resources.filter(node=>lifeAvailable(context.state,node));
  const known=ready.filter(node=>isKnownSupply(node,context));
  const recommendations=cachedRecommendations??known.filter(node=>context.permitted(node)).map(node=>{
    const route=supplyRoute(node,context);
    if(!route.length)return null;
    const length=route.reduce((sum,point,i)=>sum+distance(i?route[i-1]:context.player,point),0);
    return {id:node.id,title:node.title,expectedLoot:expectedLoot(node),distance:Math.round(length),
      distanceLabel:`沿路约 ${Math.max(1,Math.ceil(length/32))} 步`,status:node.kind==="container"?"可打开" as const:"可采集" as const};
  }).filter((node):node is SupplyRecommendation=>node!==null)
    .sort((a,b)=>a.distance-b.distance||a.id.localeCompare(b.id)).slice(0,3);
  const earliestRenewSeconds=cooling.length?Math.min(...cooling.map(node=>lifeRemainingSeconds(context.state,node))):null;
  const unknown=resources.filter(node=>!isKnownSupply(node,context)).length;
  let reason=recommendations.length?`找到 ${recommendations.length} 处已探索或近处的安全物资点，点击后会沿地面走到物件旁收集。`
    :ready.length===0&&cooling.length?`这里已领过 ${claimedContainers} 个一次性容器，${cooling.length} 处采集正在恢复；最早再活跃探索 ${earliestRenewSeconds} 秒。暂停或离线不计时。`
      :ready.length===0?resources.length?"这里的一次性物资已经取完，不会通过重进或刷新补发。":"当前场景没有可领取的生活物资，观察物件不会掉落材料。"
        :known.some(node=>context.permitted(node))?"已知物资暂时没有安全连通路线；先离开危险，或查看通道是否开放。"
          :known.length?"附近物资需要先完成原物件的调查条件；查看该物件的线索后再来。"
            :"还有物资藏在尚未探索的区域；先沿可行走的地面向阴影边缘探索，不会提前标出物件位置。";
  if(!recommendations.length&&context.roomSuggestion)reason+=` 也可以进入${context.roomSuggestion}看看。`;
  return {total:resources.length,ready:ready.length,claimedContainers,coolingGather:cooling.length,unknown,
    earliestRenewSeconds,recommendations,reason,canFind:recommendations.length>0,roomSuggestion:context.roomSuggestion};
}

/** Cache only route searches. Live counters and cooldown wording are still recalculated each view. */
export class SupplyOpportunityCache {
  private key="";
  private nav:OpportunityContext["nav"]|null=null;
  private recommendations:SupplyRecommendation[]=[];
  view(context:OpportunityContext,sceneKey:string,dangerKey:string):SupplyView {
    const resources=context.nodes.filter(node=>node.kind!=="inspect" && node.lootTable);
    const key=[sceneKey,dangerKey,Math.floor(context.player.x/24),Math.floor(context.player.y/24),
      Number(context.dangerous(context.player)),
      ...resources.map(node=>`${node.id}:${Number(lifeAvailable(context.state,node))}:${Number(isKnownSupply(node,context))}:${Number(context.permitted(node))}`)].join("|");
    const cached=this.nav===context.nav && key===this.key;
    const view=supplyOpportunities(context,cached?this.recommendations:undefined);
    this.nav=context.nav;this.key=key;this.recommendations=view.recommendations;
    return view;
  }
}
