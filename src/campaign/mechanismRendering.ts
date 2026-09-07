import type { WorldMechanism, BuiltSurface } from "./worldDesign";
import { clamp, contains, distance, polygon } from "./navigation";
import { SceneRaster } from "./SceneRaster";
import type { Point } from "./types";

/** Discrete map-matched stones; never paint a solid road over the river. */
export function surfaceStones(surface: BuiltSurface): Point[] {
  const points = polygon(surface.path), step = surface.spacing ?? 20;
  if (points.length < 2) return points;
  const lengths = points.slice(1).map((p, i) => distance(points[i], p));
  const total = lengths.reduce((a, b) => a + b, 0);
  const count = Math.max(1, Math.ceil(total / step)), result: Point[] = [];
  let segment = 0, before = 0;
  for (let i = 0; i <= count; i++) {
    const d = total * i / count;
    while (segment < lengths.length - 1 && before + lengths[segment] < d) {
      before += lengths[segment++];
    }
    const t = lengths[segment] ? (d - before) / lengths[segment] : 0;
    result.push({ x: points[segment].x + (points[segment + 1].x - points[segment].x) * t,
      y: points[segment].y + (points[segment + 1].y - points[segment].y) * t });
  }
  return result;
}
export function drawSurface(ctx: CanvasRenderingContext2D, raster: SceneRaster, surface: BuiltSurface) {
  if (!surface.art) return;
  const variants = [surface.art, ...(surface.variants ?? [])];
  surfaceStones(surface).forEach((p, i) => {
    const art = variants[i % variants.length];
    raster.draw(ctx, art, { x: p.x, y: p.y + art.height / 2 });
  });
}
export function mechanismArt(m: WorldMechanism, done: boolean) {
  return done ? m.art?.open : m.art?.closed;
}
/** Background-bound patches sit beneath actors, including in occluder clips. */
export function drawMechanismPatch(
  ctx: CanvasRenderingContext2D, raster: SceneRaster, m: WorldMechanism, done: boolean, reveal = 1,
) {
  const art = mechanismArt(m, done);
  if (m.baked && art) {
    ctx.save();
    ctx.globalAlpha *= clamp(reveal, 0, 1);
    raster.draw(ctx, art, m.position);
    ctx.restore();
  }
}
export function hitMechanism(raster: SceneRaster, m: WorldMechanism, done: boolean, q: Point) {
  if (done) return false; // Completed mechanisms are scenery, not stale closed-state hot spots.
  if (m.baked) return contains(q, m.baked);
  const art = mechanismArt(m, done);
  return art ? raster.hit(art, m.position, q) : false;
}
export function drawMechanism(
  ctx: CanvasRenderingContext2D,
  raster: SceneRaster,
  m: WorldMechanism,
  done: boolean,
  progress: number,
  hover: boolean,
  age: number,
  reduced = false,
  redrawBackground?: () => void,
) {
  const art = mechanismArt(m, done);
  if (!m.baked && art) raster.draw(ctx, art, m.position, hover);
  if (m.baked) {
    ctx.save();
    ctx.beginPath();
    m.baked.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    if (redrawBackground) {
      ctx.save();
      ctx.clip();
      redrawBackground();
      ctx.restore();
    }
    if (hover && !done) {
      ctx.strokeStyle = "#fff1b4";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
  // Effects embellish authored raster bodies; no geometric furniture fallback.
  if (m.kind === "breakable" && !reduced && (progress > 0 || (done && age < 0.65))) {
    const t = done ? age : progress * 0.65;
    ctx.save();
    ctx.globalAlpha = done ? clamp(1 - age / 0.65, 0, 1) : 0.5;
    ctx.fillStyle = "#96958e";
    for (let i = 0; i < 8; i++)
      ctx.fillRect(m.position.x + Math.cos(i * 2.4) * t * 35,
        m.position.y - m.height * 0.35 + Math.sin(i * 2.4) * t * 20 + t * 9, 2, 2);
    ctx.restore();
  }
}
