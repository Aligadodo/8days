export type AtlasName =
  | "traveler-v2"
  | "world-props"
  | "life-actors"
  | "utility-props";
interface Sprite {
  image: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  pixels: Uint8ClampedArray;
}
export class SpriteAtlas {
  private frames = new Map<string, Sprite>();
  readonly ready: Promise<void>;
  constructor() {
    this.ready = Promise.all(
      (
        [
          "traveler-v2",
          "world-props",
          "life-actors",
          "utility-props",
        ] as AtlasName[]
      ).map((name) => this.load(name)),
    ).then(() => undefined);
  }
  private async load(name: AtlasName) {
    const image = new Image();
    image.src = `/assets/sprites/${name}.png`;
    await image.decode();
    const xs =
      name === "traveler-v2"
        ? [0, 355, 624, 899, 1254]
        : [0, 313, 627, 940, 1254];
    const ys =
      name === "traveler-v2"
        ? [0, 331, 617, 908, 1254]
        : name === "world-props"
          ? [0, 326, 646, 917, 1254]
          : [0, 313, 627, 940, 1254];
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const canvas = document.createElement("canvas");
        canvas.width = xs[col + 1] - xs[col];
        canvas.height = ys[row + 1] - ys[row];
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          image,
          xs[col],
          ys[row],
          canvas.width,
          canvas.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let left = canvas.width,
          top = canvas.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < canvas.height; y++)
          for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4,
              [r, g, b] = pixels.data.slice(i, i + 3);
            if (r > 60 && b > 65 && r > g * 1.65 && b > g * 1.65)
              pixels.data[i + 3] = 0;
            if (pixels.data[i + 3] > 80) {
              left = Math.min(left, x);
              top = Math.min(top, y);
              right = Math.max(right, x);
              bottom = Math.max(bottom, y);
            }
          }
        ctx.putImageData(pixels, 0, 0);
        if (left > right) continue;
        const trimmed = document.createElement("canvas");
        trimmed.width = right - left + 1;
        trimmed.height = bottom - top + 1;
        trimmed
          .getContext("2d")!
          .drawImage(
            canvas,
            left,
            top,
            trimmed.width,
            trimmed.height,
            0,
            0,
            trimmed.width,
            trimmed.height,
          );
        const mask = document.createElement("canvas");
        mask.width = trimmed.width;
        mask.height = trimmed.height;
        const m = mask.getContext("2d")!;
        m.drawImage(trimmed, 0, 0);
        m.globalCompositeOperation = "source-in";
        m.fillStyle = "#fff3ba";
        m.fillRect(0, 0, mask.width, mask.height);
        this.frames.set(`${name}:${row * 4 + col}`, {
          image: trimmed,
          mask,
          pixels: trimmed
            .getContext("2d")!
            .getImageData(0, 0, trimmed.width, trimmed.height).data,
        });
      }
  }
  dimensions(atlas: AtlasName, index: number, height: number, maxWidth = 110) {
    const sprite = this.frames.get(`${atlas}:${index}`);
    if (!sprite) return { width: height * 0.75, height };
    const scale = Math.min(
      height / sprite.image.height,
      maxWidth / sprite.image.width,
    );
    return {
      width: sprite.image.width * scale,
      height: sprite.image.height * scale,
    };
  }
  hit(
    atlas: AtlasName,
    index: number,
    height: number,
    x: number,
    y: number,
    maxWidth = 110,
  ) {
    const sprite = this.frames.get(`${atlas}:${index}`),
      size = this.dimensions(atlas, index, height, maxWidth);
    if (Math.abs(x) > size.width / 2 + 5 || y > 6 || y < -size.height - 5)
      return false;
    if (!sprite) return false;
    const px = Math.floor(
        ((x + size.width / 2) / size.width) * sprite.image.width,
      ),
      py = Math.floor(((y + size.height) / size.height) * sprite.image.height);
    if (
      px < 0 ||
      py < 0 ||
      px >= sprite.image.width ||
      py >= sprite.image.height
    )
      return false;
    return sprite.pixels[(py * sprite.image.width + px) * 4 + 3] > 80;
  }
  draw(
    ctx: CanvasRenderingContext2D,
    atlas: AtlasName,
    index: number,
    x: number,
    y: number,
    height: number,
    hover = false,
    flip = false,
    maxWidth = 110,
  ) {
    const sprite = this.frames.get(`${atlas}:${index}`);
    if (!sprite) return;
    const size = this.dimensions(atlas, index, height, maxWidth);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    if (hover)
      for (const [dx, dy] of [
        [-2, 0],
        [2, 0],
        [0, 2],
        [0, -2],
        [-1, -1],
        [1, 1],
        [-1, 1],
        [1, -1],
      ])
        ctx.drawImage(
          sprite.mask,
          -size.width / 2 + dx,
          -size.height + dy,
          size.width,
          size.height,
        );
    ctx.drawImage(
      sprite.image,
      -size.width / 2,
      -size.height,
      size.width,
      size.height,
    );
    ctx.restore();
  }
}
