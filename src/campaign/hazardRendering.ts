import { clamp } from "./navigation";
import {
  DEATH_TIMING,
  hazardCenter,
  hazardProfile,
  trainCenterX,
  type HazardState,
} from "./hazardDirector";
import type { HazardSpec, Point } from "./types";

interface RenderOptions {
  assist: boolean;
  reduced: boolean;
  time: number;
}
const polygon = (
  ctx: CanvasRenderingContext2D,
  points: number[][],
  color: string,
) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
};

export function drawHazardGround(
  ctx: CanvasRenderingContext2D,
  h: HazardSpec,
  s: HazardState,
  options: RenderOptions,
) {
  const { kind, release, once } = hazardProfile(h),
    { x, y } = hazardCenter(h),
    r = h.rect;
  const warning = s.stage === "warning",
    releasing = s.stage === "release",
    active = s.stage === "active",
    recovery = s.stage === "recovery";
  ctx.save();
  if (options.assist && s.stage !== "spent") {
    ctx.strokeStyle = active ? "#ffc1b0" : "#ffedb599";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.ellipse(x, y, r.width / 2, r.height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (warning) {
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff0c5";
      ctx.fillText(
        `撤离 · ${Math.max(0, hazardProfile(h).warning - s.age).toFixed(1)} s`,
        x,
        y + r.height / 2 + 18,
      );
    }
  }
  if (once) {
    // A physical object's soft shadow, not a UI target circle.
    if (warning || releasing) {
      ctx.fillStyle = `rgba(24,29,31,${releasing ? 0.22 + (s.age / release) * 0.22 : 0.2})`;
      ctx.fillRect(x - r.width * 0.4, y - 10, r.width * 0.8, 18);
    }
    if (warning) {
      const count = options.reduced ? 5 : 13;
      for (let i = 0; i < count; i++) {
        const t = (s.age * 0.9 + i * 0.173) % 1;
        ctx.globalAlpha = (1 - t) * 0.8;
        ctx.fillStyle = i % 3 ? "#e9ce9b" : "#fff1c9";
        ctx.fillRect(
          Math.round(x - 42 + ((i * 37) % 86)),
          Math.round(y - 93 + t * 104),
          (i % 3) + 2,
          3,
        );
      }
      ctx.globalAlpha = 1;
    }
    if (active || recovery) {
      const age = active ? s.age : hazardProfile(h).active + s.age;
      const fade = 1 - clamp(age / 1.13, 0, 1);
      for (let i = 0; i < 16; i++) {
        const direction = i * 2.399,
          spread = 12 + (options.reduced ? 10 : age * 62);
        ctx.globalAlpha = fade * 0.55;
        ctx.fillStyle = i % 2 ? "#d9c7aa" : "#9d927f";
        const size = 7 + (i % 4) * 3;
        ctx.fillRect(
          x + Math.cos(direction) * spread - size / 2,
          y + Math.sin(direction) * spread * 0.35 - 8 - age * 14,
          size,
          size * 0.65,
        );
      }
    }
    ctx.restore();
    return;
  }
  if (!warning && !releasing && !active && !recovery) {
    ctx.restore();
    return;
  }
  const amount = warning
    ? 0.24
    : releasing
      ? 0.24 + (0.65 * s.age) / release
      : active
        ? 0.9
        : 0.9 * (1 - s.age);
  ctx.beginPath();
  ctx.ellipse(x, y, r.width / 2, r.height / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  if (kind === "electric") {
    ctx.fillStyle = "#6faebe28";
    ctx.fillRect(r.x, r.y, r.width, r.height);
    ctx.lineWidth = active ? 3 : 1.5;
    ctx.strokeStyle = active ? "#d6ffff" : "#9ddbdf";
    const offset = options.reduced ? 0 : Math.floor(options.time * 7) % 3;
    for (let i = 0; i < (active ? 7 : 2); i++) {
      const px = r.x + 17 + i * 24,
        py = y - 12 + ((i + offset) % 3) * 12;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 9, py - 10);
      ctx.lineTo(px + 6, py + 1);
      ctx.lineTo(px + 19, py - 5);
      ctx.stroke();
    }
  } else if (kind === "water" || kind === "mud") {
    ctx.globalAlpha = amount * 0.55;
    ctx.fillStyle = kind === "mud" ? "#806646" : "#53b8cf";
    ctx.fillRect(r.x, r.y, r.width, r.height);
    ctx.globalAlpha = amount;
    ctx.strokeStyle = kind === "mud" ? "#b3a079" : "#e2f9e9";
    ctx.lineWidth = active ? 2.5 : 1.3;
    for (let i = 0; i < 10; i++) {
      const dy =
        (i * 23 + (options.reduced ? 0 : options.time * (active ? 75 : 13))) %
        r.height;
      ctx.beginPath();
      ctx.ellipse(
        r.x + ((i * 41) % r.width),
        r.y + dy,
        active ? 30 : 13,
        kind === "mud" ? 4 : 2,
        -0.12,
        0,
        Math.PI,
      );
      ctx.stroke();
    }
  } else if (kind === "smoke" || kind === "steam") {
    for (let i = 0; i < 14; i++) {
      const drift = options.reduced
        ? i * 11
        : (options.time * 24 + i * 29) % r.height;
      ctx.globalAlpha = amount * 0.38;
      ctx.fillStyle = kind === "smoke" ? "#666474" : "#e4f4e5";
      ctx.fillRect(
        r.x + ((i * 37) % r.width) - 15,
        r.y + r.height - drift,
        35 + (i % 4) * 8,
        14,
      );
    }
  } else if (kind === "train") {
    // Rails/headlight before arrival; the moving vehicle is rendered in the object layer.
    ctx.globalAlpha = amount * 0.7;
    ctx.fillStyle = "#ffeab4";
    polygon(
      ctx,
      [
        [r.x, y - 5],
        [r.x + r.width, y - 25],
        [r.x + r.width, y + 25],
      ],
      "#ffeab4",
    );
    ctx.strokeStyle = "#d4d9d3";
    ctx.lineWidth = 2;
    [y - 18, y + 18].forEach((line) => {
      ctx.beginPath();
      ctx.moveTo(r.x, line);
      ctx.lineTo(r.x + r.width, line);
      ctx.stroke();
    });
  } else {
    ctx.globalAlpha = amount;
    ctx.strokeStyle = "#e5eac6";
    ctx.lineWidth = active ? 2 : 1;
    for (let i = 0; i < 13; i++) {
      const px =
          r.x +
          ((i * 29 + (options.reduced ? 0 : options.time * 115)) % r.width),
        py = r.y + ((i * 23) % r.height);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + 23, py - 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawHazardObject(
  ctx: CanvasRenderingContext2D,
  h: HazardSpec,
  s: HazardState,
  reduced: boolean,
) {
  const profile = hazardProfile(h),
    { x, y } = hazardCenter(h);
  const warning = s.stage === "warning",
    releasing = s.stage === "release";
  const landed =
    s.stage === "active" || s.stage === "recovery" || s.stage === "spent";
  if (profile.kind === "train") {
    if (s.stage !== "active") return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(h.rect.x, h.rect.y - 56, h.rect.width, h.rect.height + 56);
    ctx.clip();
    ctx.translate(trainCenterX(h, s), y);
    ctx.fillStyle = "#273d50";
    ctx.fillRect(-54, -68, 108, 66);
    ctx.fillStyle = "#86aeb0";
    ctx.fillRect(-50, -63, 100, 5);
    ctx.fillStyle = "#eac887";
    ctx.fillRect(-38, -50, 27, 23);
    ctx.fillRect(4, -50, 27, 23);
    ctx.fillStyle = "#c6ae80";
    ctx.fillRect(-50, -17, 100, 5);
    ctx.fillStyle = "#182835";
    ctx.fillRect(-39, -2, 17, 8);
    ctx.fillRect(24, -2, 17, 8);
    ctx.restore();
    return;
  }
  if (!profile.once) return;
  if (profile.kind === "sign") {
    ctx.save();
    // Wall bracket and the two distinct suspensions remain visible after the fall.
    ctx.fillStyle = "#26343f";
    ctx.fillRect(x - 57, y - 180, 7, 50);
    ctx.fillRect(x - 54, y - 159, 103, 6);
    ctx.fillStyle = "#697172";
    ctx.fillRect(x - 52, y - 158, 99, 2);
    const sway =
      warning && !reduced ? Math.sin(s.age * 23) * (0.035 + s.age * 0.026) : 0;
    ctx.strokeStyle = "#81817a";
    ctx.lineWidth = 2;
    [-32, 32].forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(x + offset, y - 153);
      ctx.lineTo(
        x +
          offset +
          (landed || releasing ? offset * 0.15 : Math.sin(sway) * 20),
        y - (landed || releasing ? 143 : 132),
      );
      ctx.stroke();
    });
    const t = releasing ? clamp(s.age / profile.release, 0, 1) : 0;
    const centerY = landed ? y - 5 : y - 110 + t * t * 105;
    ctx.translate(x + (landed ? 4 : 0), centerY);
    ctx.rotate(landed ? -0.11 : sway + t * 0.15);
    if (landed) ctx.scale(1, 0.5);
    ctx.fillStyle = "#23383d";
    ctx.fillRect(-55, -24, 110, 48);
    ctx.fillStyle = "#c08d52";
    ctx.fillRect(-53, -22, 106, 44);
    ctx.fillStyle = "#e6c089";
    ctx.fillRect(-50, -19, 100, 3);
    ctx.fillStyle = "#374a47";
    ctx.fillRect(-48, -15, 96, 30);
    ctx.fillStyle = "#f2dcac";
    ctx.fillRect(-34, -6, 17, 12);
    ctx.fillRect(-36, 7, 22, 3);
    ctx.fillRect(-17, -4, 5, 3);
    ctx.fillRect(-15, -1, 3, 5);
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("CAFE", -4, 5);
    [-47, 46].forEach((px) => {
      ctx.fillStyle = "#edce94";
      ctx.fillRect(px, -19, 3, 3);
      ctx.fillRect(px, 16, 3, 3);
    });
    if (landed) {
      ctx.strokeStyle = "#1c2b2c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(11, -23);
      ctx.lineTo(3, -6);
      ctx.lineTo(17, 6);
      ctx.lineTo(9, 23);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  if (s.stage === "dormant") return;
  ctx.save();
  const fall = releasing
    ? clamp(s.age / profile.release, 0, 1) ** 2
    : landed
      ? 1
      : 0;
  const branch = /枝/.test(h.title),
    ice = /冰|晶/.test(h.title);
  for (let i = 0; i < (branch ? 2 : 5); i++) {
    const px = x + (i - 2) * 19,
      py = y - 98 + fall * 95 + (i % 2) * 6;
    if (warning) ctx.globalAlpha = 0.8;
    if (branch) {
      ctx.fillStyle = "#685035";
      ctx.fillRect(x - 46 + i * 31, py, 68, 8);
      ctx.fillRect(x - 21 + i * 25, py - 10, 7, 15);
    } else
      polygon(
        ctx,
        [
          [px - 9, py - 9],
          [px + 2, py - 16],
          [px + 12, py - 5],
          [px + 7, py + 5],
          [px - 8, py + 3],
        ],
        ice ? "#accfde" : "#918b79",
      );
  }
  ctx.restore();
}

/** A small non-graphic soul, with a scarf tying it back to the yellow-coated traveler. */
export function drawSoul(
  ctx: CanvasRenderingContext2D,
  player: Point,
  age: number,
  reduced: boolean,
) {
  if (age < DEATH_TIMING.soul) return;
  const t = clamp((age - DEATH_TIMING.soul) / 1.5, 0, 1);
  ctx.save();
  ctx.globalAlpha = Math.min(1, t * 7) * (1 - clamp((t - 0.72) / 0.28, 0, 1));
  ctx.translate(
    Math.round(player.x + (reduced ? 0 : Math.sin(t * 5) * 8)),
    Math.round(player.y - 35 - (reduced ? 27 : t * 112)),
  );
  polygon(
    ctx,
    [
      [-14, -8],
      [-10, -17],
      [-5, -21],
      [6, -21],
      [12, -17],
      [16, -9],
      [16, 5],
      [11, 10],
      [6, 6],
      [0, 11],
      [-5, 7],
      [-12, 11],
      [-15, 4],
    ],
    "#bcdfdb",
  );
  polygon(
    ctx,
    [
      [-11, -8],
      [-8, -16],
      [-3, -18],
      [5, -18],
      [10, -14],
      [13, -7],
      [13, 3],
      [7, 4],
      [1, 7],
      [-5, 4],
      [-11, 6],
    ],
    "#f7f6dd",
  );
  ctx.fillStyle = "#507378";
  ctx.fillRect(-6, -9, 3, 4);
  ctx.fillRect(5, -9, 3, 4);
  ctx.fillStyle = "#eac66e";
  ctx.fillRect(-11, 0, 23, 4);
  ctx.fillRect(6, 3, 5, 8);
  if (!reduced) {
    ctx.fillStyle = "#e8f7cd";
    ctx.fillRect(-9, 21 + t * 8, 3, 3);
    ctx.fillRect(6, 34 + t * 9, 2, 2);
  }
  ctx.restore();
}
