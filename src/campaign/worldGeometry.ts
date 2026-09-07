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
          !groundMarks.has(id) && !world.baked[id] && !world.solidProps[id] &&
          world.visuals[id]?.layer !== "ground" &&
          !["wall", "table", "hanging"].includes(world.visuals[id]?.mount ?? "ground"),
      )
      .map(([id, p]) => {
        const visual = world.visuals[id];
        const width = Math.min(26, visual?.maxWidth ?? 26, (visual?.height ?? 58) * 0.45);
        const height = Math.min(18, width * 0.7);
        return rectangle(p.x - width / 2, p.y - height * 0.72, width, height);
      }),
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
          (!mechanismOpen(m, flags) || !!m.art?.open) &&
          !["wall", "table", "hanging"].includes(m.visual?.mount ?? "ground") &&
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
