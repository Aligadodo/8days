import type { Entity } from "./entities";
import { hasGroundShadow } from "./entities";
import type { Point } from "./types";
import { SpriteAtlas } from "./SpriteAtlas";

export function drawBakedObject(ctx: CanvasRenderingContext2D, entity: Entity, done: boolean, hover: boolean,
  redrawBackground?: () => void) {
  if (!entity.baked) return;
  ctx.save();
  ctx.beginPath();
  entity.baked.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.closePath();
  if (redrawBackground) {
    ctx.save();
    ctx.clip();
    redrawBackground();
    ctx.restore();
  }
  if (entity.id === "turn-off-screen" && done) {
    ctx.fillStyle = "#03070bab";
    ctx.fill();
  }
  if (hover) {
    ctx.strokeStyle = "#fff1b4";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlacedSprite(ctx: CanvasRenderingContext2D, atlas: SpriteAtlas,
  entity: Entity, position: Point, frame: number, hover: boolean, environment: string) {
  if (hasGroundShadow(entity)) {
    ctx.fillStyle = "#18272c2b";
    ctx.beginPath();
    ctx.ellipse(position.x, position.y - 1, entity.height * 0.23, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  // Reusable daylight sprites receive local ambient light, never a floating universal halo.
  if (environment === "night-office") ctx.filter = "saturate(0.78) brightness(0.85)";
  else if (environment === "glow-cave") ctx.filter = "saturate(0.88) brightness(0.91)";
  atlas.draw(ctx, entity.atlas, frame, position.x, position.y, entity.height, hover,
    false, entity.visual?.maxWidth);
  ctx.restore();
}
