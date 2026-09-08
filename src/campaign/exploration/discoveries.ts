import type { Entity } from "../entities";
import type { DiscoveryNode, ExplorationPack, RoomDefinition } from "./schema";

export const allDiscoveries = (pack?: ExplorationPack) => pack ? [...pack.outside, ...pack.room.nodes] : [];
export function discoveryEntity(node: DiscoveryNode): Entity {
  return { ...node.position, id: node.id, name: node.title, type: "discovery", discovery: node,
    approach: { ...node.approach }, baked: node.baked, visual: node.visual,
    atlas: node.animal ? "critters" : "world-props", frame: node.animal === "dog" ? 4 : node.animal === "mouse" ? 8 : 0,
    height: node.visual.height ?? (node.animal === "mouse" ? 18 : node.animal ? 30 : 35) };
}
export function roomPortal(room: RoomDefinition, inside: boolean): Entity {
  const entry = room.entry;
  return { ...(inside ? room.world.positions.exit : entry.position),
    id: `${room.id}-${inside ? "return" : "enter"}`, type: "portal", portal: inside ? "outside" : room.id,
    approach: { ...(inside ? room.world.approaches.exit : entry.approach) },
    baked: inside ? room.world.baked.exit : entry.baked,
    name: inside ? "返回大地图" : entry.title,
    visual: { ...(inside ? room.world.visuals.exit : {}), mount: "door", support: inside ? "室内原入口，原路返回" : entry.support },
    atlas: "world-props", frame: 15, height: 65 };
}
export function settleDiscovery(node: DiscoveryNode, nodes: DiscoveryNode[], flags: Set<string>, history: string[]) {
  if (flags.has(node.id)) {
    if (node.kind === "inspect") rememberInspection(history, node.id);
    return { status: "repeat" as const, message: node.result };
  }
  const missing = (node.requires ?? []).filter(id => !flags.has(id));
  if (missing.length) return { status: "locked" as const,
    message: `${node.description} 还需要：${missing.map(id => nodes.find(n => n.id === id)?.title ?? "一处发现").join("、")}。` };
  if (node.sequence && node.sequence.some((id, i) => history.slice(-node.sequence!.length)[i] !== id)) {
    history.length = 0;
    return { status: "sequence" as const, message: `${node.description} 顺序还没有对应上，按线索重新触碰那些物件，再回来确认。` };
  }
  flags.add(node.id);
  if (node.kind === "inspect") rememberInspection(history, node.id);
  return { status: "new" as const, message: node.result };
}
function rememberInspection(history: string[], id: string) {
  history.push(id);
  if (history.length > 20) history.splice(0, history.length - 20);
}
export const earnedAchievements = (pack: ExplorationPack | undefined, flags: Set<string>) =>
  pack?.achievements.filter(a => a.requires.length > 0 && a.requires.every(id => flags.has(id))) ?? [];
