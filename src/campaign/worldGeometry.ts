import { Navigation, rectangle, type Polygon } from "./navigation";
import type { WorldDesign, WorldMechanism } from "./worldDesign";

export function mechanismOpen(m: WorldMechanism, flags: ReadonlySet<string>) {
  return flags.has(m.controlledBy ?? m.id);
}
export function mechanismBlocker(m: WorldMechanism): Polygon {
  return rectangle(m.position.x - m.width / 2, m.position.y - 15, m.width, 24);
}
export function buildWorldNavigation(
  world: WorldDesign,
  flags: ReadonlySet<string>,
) {
  const groundMarks = new Set([
    "drain-order",
    "flower-bells",
    "footprints",
    "lily-path",
    "river-pulse",
    "flower-bridge",
    "help-cat",
    "bee",
    "bat",
    "water-coworker",
    "photo",
    "scarf",
    "raincoat",
    "warm-pack",
    "snowman",
    "thermos",
    "tea",
    "tea-jar",
  ]);
  const blockers = [
    ...world.blockers,
    ...Object.values(world.solidProps).map((r) =>
      rectangle(r.x, r.y, r.width, r.height),
    ),
    ...Object.entries(world.positions)
      .filter(
        ([id]) =>
          !groundMarks.has(id) && !world.baked[id] && !world.solidProps[id],
      )
      .map(([, p]) => rectangle(p.x - 13, p.y - 13, 26, 18)),
    ...world.mechanisms
      .filter(
        (m) =>
          (m.kind === "gate" || m.kind === "breakable") &&
          !mechanismOpen(m, flags),
      )
      .map(mechanismBlocker),
    ...world.mechanisms
      .filter(
        (m) =>
          (m.kind === "tool" || m.kind === "cache") &&
          (m.requires ?? []).every((id) => flags.has(id)),
      )
      .map((m) => rectangle(m.position.x - 8, m.position.y - 8, 16, 12)),
  ];
  return new Navigation(
    world.regions.filter((r) => !r.requires || flags.has(r.requires)),
    blockers,
  );
}
export function allWorldFlags(world: WorldDesign, puzzleIds: string[]) {
  return new Set([...puzzleIds, ...world.mechanisms.map((m) => m.id)]);
}
