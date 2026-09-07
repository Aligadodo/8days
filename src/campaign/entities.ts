import type { AtlasName } from "./SpriteAtlas";
import type { LevelDefinition, Point } from "./types";
import { WORLDS, type WorldMechanism, type ObjectVisual } from "./worldDesign";
import type { Polygon } from "./navigation";

export interface Entity extends Point {
  id: string;
  type: "puzzle" | "side" | "exit" | "mechanism";
  approach: Point;
  baked?: Polygon;
  mechanism?: WorldMechanism;
  visual?: ObjectVisual;
  atlas: AtlasName;
  frame: number;
  height: number;
  doneFrame?: number;
  name: string;
}
type Art = [AtlasName, number, number, number?];
const world = (index: number, height = 65): Art => [
  "world-props",
  index,
  height,
];
const life = (index: number, height = 65, done?: number): Art => [
  "life-actors",
  index,
  height,
  done,
];
const utility = (index: number, height = 65, done?: number): Art => [
  "utility-props",
  index,
  height,
  done,
];
export const ENTITY_ART: Record<string, Art> = {
  "drain-order": world(0, 33),
  "bus-route": utility(11, 69),
  "signal-cycle": world(12, 88),
  "platform-lock": utility(7, 74),
  breaker: world(2, 73),
  alarm: utility(8, 56),
  "stair-map": utility(6, 56),
  "door-code": utility(7, 55),
  mill: world(4, 88),
  picnic: world(5, 49),
  "flower-bells": world(6, 51),
  footprints: world(7, 32),
  valves: world(8, 53),
  "lily-path": world(9, 38),
  gondola: world(10, 89),
  "rainbow-time": world(11, 65),
  "tide-route": world(1, 63),
  "ferry-balance": utility(5, 56),
  "orchard-lights": world(13, 55),
  "last-ticket": utility(11, 66),
  "high-route": world(1, 66),
  lightning: utility(6, 54),
  "echo-whistle": utility(12, 44),
  "shelter-lock": utility(7, 71),
  "signal-order": world(12, 87),
  "lamp-pattern": world(13, 55),
  "lost-tag": utility(10, 55),
  carriage: utility(11, 68),
  "crystal-safe": world(14, 68),
  "river-pulse": world(9, 39),
  "flower-bridge": world(6, 49),
  "morning-count": world(11, 62),
  "help-cat": life(0, 46, 1),
  "call-home": world(3, 64),
  "water-coworker": life(4, 76),
  "turn-off-screen": utility(0, 62, 1),
  tea: life(12, 43),
  bee: life(2, 25),
  photo: life(6, 77),
  fern: utility(2, 47, 3),
  "tea-jar": life(13, 38),
  scarf: life(7, 70),
  raincoat: life(9, 74),
  thermos: life(15, 43),
  "warm-pack": life(8, 76),
  snowman: life(10, 66, 11),
  bat: life(3, 27),
  "old-cart": utility(4, 60),
};
export function entitiesFor(level: LevelDefinition): Entity[] {
  const world = WORLDS[level.day - 1];
  return [
    ...level.puzzles.map((q) => ({
      id: q.id,
      type: "puzzle" as const,
      position: q.position,
      name: q.title,
    })),
    ...level.sideTasks.map((q) => ({
      id: q.id,
      type: "side" as const,
      position: q.position,
      name: q.title,
    })),
  ]
    .map<Entity>((q) => {
      const [atlas, frame, height, doneFrame] = ENTITY_ART[q.id];
      return {
        ...q.position,
        id: q.id,
        type: q.type,
        name: q.name,
        approach: world.approaches[q.id],
        baked: world.baked[q.id],
        visual: world.visuals[q.id],
        atlas: world.visuals[q.id]?.atlas ?? atlas,
        frame: world.visuals[q.id]?.frame ?? frame,
        height: world.visuals[q.id]?.height ?? height,
        doneFrame: world.visuals[q.id]?.frame === undefined ? doneFrame : undefined,
      };
    })
    .concat([
      {
        ...level.exit,
        id: "exit",
        approach: world.approaches.exit,
        baked: world.baked.exit,
        visual: world.visuals.exit,
        type: "exit",
        name: "今日终点",
        atlas: world.visuals.exit?.atlas ?? (
          level.environment === "night-office"
            ? "utility-props"
            : "world-props"),
        frame: world.visuals.exit?.frame ?? (level.environment === "night-office" ? 9 : 15),
        height: world.visuals.exit?.height ?? 85,
        doneFrame: undefined,
      },
    ])
    .concat(
      world.mechanisms.map((m) => ({
        ...m.position,
        id: m.id,
        type: "mechanism" as const,
        name: m.name,
        approach: m.approach,
        mechanism: m,
        baked: m.baked,
        visual: m.visual,
        atlas: "utility-props" as const,
        frame: 14,
        height: m.height,
      })),
    );
}

/** Sorting and hit testing share one support-depth rule. Ground decals never cover actors. */
export function entityDepth(entity: Entity, position: Point = entity): number {
  return entity.visual?.layer === "ground" ? -1 : (entity.visual?.depth ?? position.y);
}
export function hasGroundShadow(entity: Entity): boolean {
  return !entity.baked && (entity.visual?.mount === "ground" || entity.visual?.mount === "actor") &&
    entity.visual?.layer !== "ground" && entity.height > 40;
}
