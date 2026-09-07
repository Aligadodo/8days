import type { Point } from "./types";
import type { RasterArt } from "./worldSchema";

interface Frame {
  image: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
}
export function artBounds(art: RasterArt, anchor: Point) {
  return {
    x: anchor.x + (art.offset?.x ?? 0) - art.width / 2,
    y: anchor.y + (art.offset?.y ?? 0) - art.height,
    w: art.width,
    h: art.height,
  };
}
const key = (art: RasterArt) => `${art.src}:${JSON.stringify(art.crop ?? null)}`;

/** Scene artwork keeps its authored registration and alpha; never auto-trim a patch. */
export class SceneRaster {
  private frames = new Map<string, Frame>();
  private pending = new Map<string, Promise<void>>();
  private sources = new Map<string, Promise<HTMLImageElement>>();
  preload(art: RasterArt): Promise<void> {
    const id = key(art);
    if (this.pending.has(id)) return this.pending.get(id)!;
    const task = this.load(art).then((frame) => { this.frames.set(id, frame); });
    this.pending.set(id, task);
    return task;
  }
  private async load(art: RasterArt): Promise<Frame> {
    let source = this.sources.get(art.src);
    if (!source) {
      const image = new Image();
      image.src = art.src;
      source = image.decode().then(() => image);
      this.sources.set(art.src, source);
    }
    const image = await source;
    const c = art.crop ?? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    if (c.x < 0 || c.y < 0 || c.width <= 0 || c.height <= 0 ||
        c.x + c.width > image.naturalWidth || c.y + c.height > image.naturalHeight)
      throw new Error(`Scene artwork crop outside source: ${art.src}`);
    const canvas = document.createElement("canvas");
    canvas.width = c.width;
    canvas.height = c.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, c.x, c.y, c.width, c.height, 0, 0, c.width, c.height);
    const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
    const mask = document.createElement("canvas");
    mask.width = c.width;
    mask.height = c.height;
    const m = mask.getContext("2d")!;
    m.drawImage(canvas, 0, 0);
    m.globalCompositeOperation = "source-in";
    m.fillStyle = "#fff3ba";
    m.fillRect(0, 0, c.width, c.height);
    return { image: canvas, mask, pixels };
  }
  hit(art: RasterArt, anchor: Point, point: Point) {
    const frame = this.frames.get(key(art));
    if (!frame) return false; // Missing art is not an invisible clickable rectangle.
    const b = artBounds(art, anchor);
    const x = Math.floor((point.x - b.x) / b.w * frame.image.width);
    const y = Math.floor((point.y - b.y) / b.h * frame.image.height);
    return x >= 0 && y >= 0 && x < frame.image.width && y < frame.image.height &&
      frame.pixels[(y * frame.image.width + x) * 4 + 3] > 80;
  }
  draw(ctx: CanvasRenderingContext2D, art: RasterArt, anchor: Point, hover = false) {
    const frame = this.frames.get(key(art));
    if (!frame) return;
    const b = artBounds(art, anchor);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (hover)
      for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
        ctx.drawImage(frame.mask, b.x + x, b.y + y, b.w, b.h);
    ctx.drawImage(frame.image, b.x, b.y, b.w, b.h);
    ctx.restore();
  }
}
