import type { Entity } from "./entities";
import type { Point } from "./types";
import type { WorldDesign, WorldOccluder } from "./worldSchema";
import { WORLD, contains } from "./navigation";

/** The front support edge can slope across the painting. Clamp outside its ends:
 * an actor's body can overlap an object's silhouette while its foot is beside it. */
export function contactDepthAt(contactLine: readonly Point[] | undefined, x: number, fallback: number): number {
  if (!contactLine?.length) return fallback;
  if (contactLine.length === 1) return contactLine[0].y;
  const depths: number[] = [];
  for (let i = 1; i < contactLine.length; i++) {
    const a = contactLine[i - 1], b = contactLine[i];
    if (x < Math.min(a.x, b.x) || x > Math.max(a.x, b.x)) continue;
    depths.push(Math.abs(b.x - a.x) < 1e-8 ? Math.max(a.y, b.y) : a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x));
  }
  if (depths.length) return Math.max(...depths);
  return contactLine.reduce((a, b) => Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b).y;
}

export function occludesFoot(occluder: WorldOccluder, foot: Point) {
  return foot.y < contactDepthAt(occluder.contactLine, foot.x, occluder.depth) - .01;
}
/** Match hit testing to the same silhouette used to clip a moving actor. */
export function isPointOccluded(point: Point, foot: Point, occluders: readonly WorldOccluder[]) {
  return occluders.some(o => occludesFoot(o, foot) && contains(point, o.polygon));
}

/** Draw static/baked scenery before actors. Their silhouettes form a per-actor
 * mask; opened gates cannot reuse the old closed door's clickable polygon. */
export function collectSceneOccluders(world: WorldDesign, entities: readonly Entity[], flags: ReadonlySet<string>): WorldOccluder[] {
  const authored = world.occluders.filter(o => (!o.requires || flags.has(o.requires)) && (!o.unless || !flags.has(o.unless)));
  const baked: WorldOccluder[] = [];
  for (const entity of entities) {
    if (!entity.baked || entity.visual?.layer === "ground" || entity.discovery?.animal) continue;
    const mechanism = entity.mechanism;
    if (mechanism && flags.has(mechanism.controlledBy ?? mechanism.id) && ["gate", "breakable"].includes(mechanism.kind)) continue;
    baked.push({ name: entity.id, polygon: entity.baked,
      depth: entity.visual?.depth ?? entity.y,
      contactLine: entity.visual?.contactLine });
  }
  return [...authored, ...baked];
}

/** Intersect inverse silhouette clips separately. A single even-odd path with
 * overlapping occluders would XOR holes and reveal the actor through two walls.
 * Only actor pixels are clipped: no background repaint can erase another actor. */
export function drawWithOcclusion(ctx: CanvasRenderingContext2D, foot: Point, occluders: readonly WorldOccluder[], draw: () => void) {
  ctx.save();
  for (const occluder of occluders) {
    if (!occludesFoot(occluder, foot) || occluder.polygon.length < 3) continue;
    ctx.beginPath();
    ctx.rect(-WORLD.width, -WORLD.height, WORLD.width * 3, WORLD.height * 3);
    occluder.polygon.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    ctx.clip("evenodd");
  }
  draw();
  ctx.restore();
}
