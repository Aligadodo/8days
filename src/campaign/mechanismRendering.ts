import type { WorldMechanism, BuiltSurface } from "./worldDesign";
import { clamp, distance, polygon } from "./navigation";

export function drawSurface(
  ctx: CanvasRenderingContext2D,
  surface: BuiltSurface,
) {
  const points = polygon(surface.path);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (surface.material === "stone") {
    const cave = surface.name.includes("壁龛");
    ctx.strokeStyle = cave ? "#242b43" : "#34433e";
    ctx.lineWidth = surface.width + 2;
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = cave ? "#4c4960" : "#657368";
    ctx.lineWidth = surface.width;
    ctx.stroke();
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i],
        b = points[i + 1],
        length = distance(a, b),
        count = Math.ceil(length / 11),
        nx = -(b.y - a.y) / length,
        ny = (b.x - a.x) / length;
      for (let j = 0; j < count; j++)
        for (let side = -1; side <= 1; side++) {
          const x = Math.round(
              a.x +
                ((b.x - a.x) * (j + 0.5)) / count +
                nx * side * surface.width * 0.28,
            ),
            y = Math.round(
              a.y +
                ((b.y - a.y) * (j + 0.5)) / count +
                ny * side * surface.width * 0.28,
            ),
            r = Math.max(4, surface.width / 7),
            seed = (i * 11 + j * 7 + side + 3) % 4;
          shape(
            ctx,
            [
              [x - r, y - 4],
              [x - 2, y - 7],
              [x + r + 1, y - 4],
              [x + r, y + 3],
              [x, y + 5],
              [x - r - 1, y + 2],
            ],
            cave
              ? ["#625d74", "#555d74", "#6b6379", "#4e586e"][seed]
              : ["#859083", "#7b8476", "#8d9280", "#778479"][seed],
          );
          ctx.fillStyle = cave ? "#8e8298" : "#b0b39b";
          ctx.fillRect(x - r + 2, y - 4, r + 2, 1);
          ctx.fillStyle = cave ? "#363650" : "#47584c";
          ctx.fillRect(x - 2, y + 4, r + 1, 2);
          if (seed === 1) {
            ctx.fillStyle = cave ? "#447175" : "#527b5e";
            ctx.fillRect(x + r - 3, y, 3, 2);
          }
        }
    }
    ctx.restore();
    return;
  }
  ctx.strokeStyle = surface.material === "wood" ? "#4d372a" : "#34464a";
  ctx.lineWidth = surface.width + 5;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.strokeStyle = surface.material === "wood" ? "#b29667" : "#879080";
  ctx.lineWidth = surface.width;
  ctx.stroke();
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1],
      steps = Math.ceil(distance(a, b) / 11),
      angle = Math.atan2(b.y - a.y, b.x - a.x);
    for (let j = 0; j < steps; j++) {
      ctx.save();
      ctx.translate(
        a.x + ((b.x - a.x) * j) / steps,
        a.y + ((b.y - a.y) * j) / steps,
      );
      ctx.rotate(angle);
      ctx.fillStyle =
        surface.material === "wood"
          ? j % 3
            ? "#ad946d"
            : "#bea579"
          : j % 3
            ? "#989f8c"
            : "#b0b59a";
      ctx.fillRect(-4, -surface.width / 2 + 2, 9, surface.width - 4);
      ctx.fillStyle = surface.material === "wood" ? "#624c39" : "#55675d";
      ctx.fillRect(-5, -surface.width / 2 + 3, 1, surface.width - 6);
      ctx.restore();
    }
  }
  ctx.restore();
}
const shape = (
  ctx: CanvasRenderingContext2D,
  coords: number[][],
  color: string,
  hover = false,
) => {
  ctx.beginPath();
  coords.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (hover) {
    ctx.strokeStyle = "#fff1b4";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};
export function drawMechanism(
  ctx: CanvasRenderingContext2D,
  m: WorldMechanism,
  done: boolean,
  progress: number,
  hover: boolean,
  age: number,
  powered = false,
) {
  const { width: w, height: h } = m,
    t = clamp(progress, 0, 1);
  ctx.save();
  ctx.translate(Math.round(m.position.x), Math.round(m.position.y));
  if (m.kind === "breakable") {
    if (done) {
      ctx.fillStyle = "#6e7e85";
      [-22, -13, 17, 27].forEach((x, i) =>
        ctx.fillRect(x, -3 - (i % 2) * 3, 9, 5),
      );
      if (age < 0.65) {
        ctx.globalAlpha = 1 - age / 0.65;
        ctx.fillStyle = "#b9c8b1";
        for (let i = 0; i < 10; i++)
          ctx.fillRect(
            Math.cos(i * 2.4) * age * 45,
            -12 - Math.sin(i * 2.4) * age * 24,
            4,
            4,
          );
      }
    } else {
      const outline = [
        [-w / 2 - 4, -1],
        [-w / 2, -h + 18],
        [-w / 2 + 7, -h + 16],
        [-w / 2 + 8, -h + 4],
        [-7, -h],
        [8, -h + 5],
        [w / 2 - 7, -h + 2],
        [w / 2, -h + 18],
        [w / 2 + 3, -5],
        [14, 3],
      ];
      shape(ctx, outline, "#253952", hover);
      shape(
        ctx,
        [
          [-w / 2 + 3, -7],
          [-w / 2 + 7, -h + 10],
          [-7, -h + 4],
          [7, -h + 9],
          [w / 2 - 5, -h + 7],
          [w / 2 - 2, -8],
          [12, -1],
        ],
        "#48607a",
      );
      shape(
        ctx,
        [
          [-w / 2 + 7, -h + 10],
          [-7, -h + 4],
          [7, -h + 9],
          [1, -h + 17],
          [-w / 2 + 5, -h + 19],
        ],
        "#75819d",
      );
      shape(
        ctx,
        [
          [8, -h + 12],
          [w / 2 - 5, -h + 7],
          [w / 2 - 2, -8],
          [10, -1],
          [14, -24],
        ],
        "#343b5c",
      );
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++) {
          const x = -w / 2 + 6 + col * 16 + (row % 2 ? 4 : 0),
            y = -h + 22 + row * 12;
          if (x + 10 < w / 2 - 4) {
            ctx.fillStyle = ["#65768c", "#556686", "#596986"][(row + col) % 3];
            ctx.fillRect(x, y, 10, 7);
            ctx.fillStyle = "#8492a5";
            ctx.fillRect(x, y, 9, 1);
            ctx.fillStyle = "#30364f";
            ctx.fillRect(x + 2, y + 7, 9, 2);
          }
        }
      ctx.strokeStyle = "#182b38";
      ctx.lineWidth = 2 + t * 2;
      ctx.beginPath();
      ctx.moveTo(3, -h + 4);
      ctx.lineTo(-7, -h * 0.66);
      ctx.lineTo(5, -h * 0.46);
      ctx.lineTo(-3, -h * 0.2);
      ctx.lineTo(9, 0);
      ctx.stroke();
      ctx.fillStyle = "#e8d39a";
      ctx.fillRect(-3, -h * 0.45, 3, 3);
      ctx.fillRect(1, -h * 0.44 + 5, 2, 2);
      ctx.fillStyle = "#36556d";
      ctx.fillRect(-w / 2 - 3, -6, 12, 5);
      ctx.fillStyle = "#527c7b";
      ctx.fillRect(-w / 2, -8, 8, 3);
      ctx.fillRect(w / 2 - 9, -5, 12, 3);
      if (t > 0) {
        ctx.fillStyle = "#c6c9b3";
        for (let i = 0; i < 7; i++)
          ctx.fillRect(
            ((i * 23) % w) - w / 2,
            -h * 0.4 + ((t * 63 + i * 11) % 32),
            3,
            3,
          );
      }
    }
  } else if (m.kind === "gate") {
    const open = done ? 1 : clamp((t - 0.3) / 0.7, 0, 1);
    if (open > 0) {
      ctx.fillStyle = "#15222c";
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.fillStyle = "#879178";
      ctx.fillRect(-w / 2, 0, w, 7);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2 - 3, -h - 3, w + 6, h + 10);
    ctx.clip();
    ctx.translate(open * w, 0);
    if (m.id.includes("vine")) {
      ctx.strokeStyle = "#476248";
      ctx.lineWidth = 6;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + i * 15, 0);
        ctx.lineTo(w / 2 - i * 13, -h);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++)
        shape(
          ctx,
          [
            [((i * 17) % w) - w / 2, -h + ((i * 23) % h)],
            [((i * 17) % w) - w / 2 + 12, -h + ((i * 23) % h) - 5],
            [((i * 17) % w) - w / 2 + 5, -h + ((i * 23) % h) + 9],
          ],
          "#8bba87",
          hover,
        );
    } else {
      shape(
        ctx,
        [
          [-w / 2, 0],
          [-w / 2, -h],
          [w / 2, -h],
          [w / 2, 0],
        ],
        m.id.includes("hidden") ? "#5c5040" : "#3d6259",
        hover,
      );
      ctx.fillStyle = "#af9872";
      ctx.fillRect(-w / 2 + 3, -h + 4, w - 6, 4);
      ctx.fillRect(-w / 2 + 3, -4, w - 6, 4);
      if (m.id.includes("hidden"))
        for (let row = 0; row < 3; row++) {
          ctx.fillStyle = "#a38b66";
          ctx.fillRect(-w / 2 + 4, -h + 30 + row * 28, w - 8, 3);
          for (let j = 0; j < 5; j++) {
            ctx.fillStyle = ["#778a79", "#b49762", "#607d85"][j % 3];
            ctx.fillRect(-w / 2 + 6 + j * 9, -h + 10 + row * 28, 6, 18);
          }
        }
      else {
        ctx.fillStyle = "#dce9b9";
        ctx.fillRect(-5, -h + 16, 10, 20);
        ctx.fillStyle = "#e5c777";
        ctx.fillRect(w / 2 - 13, -h * 0.45, 6, 4);
      }
    }
    ctx.restore();
  } else if (m.kind === "lever") {
    shape(
      ctx,
      [
        [-12, 0],
        [-12, -18],
        [12, -18],
        [12, 0],
      ],
      "#73796d",
      hover,
    );
    ctx.strokeStyle = "#463c35";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(done || t > 0.4 ? 12 : -10, -h + 8);
    ctx.stroke();
    ctx.fillStyle = done || t > 0.4 ? "#b5d997" : "#dec284";
    ctx.fillRect(done || t > 0.4 ? 6 : -16, -h + 4, 12, 8);
    ctx.fillStyle = powered ? "#b2e99a" : "#514f44";
    ctx.fillRect(5, -12, 4, 3);
  } else if (m.kind === "tool") {
    shape(
      ctx,
      [
        [-w / 2, -3],
        [-w / 2 - 2, -18],
        [-w / 2 + 7, -23],
        [w / 2, -17],
        [w / 2 - 2, -1],
        [4, 3],
      ],
      "#584438",
      hover,
    );
    shape(
      ctx,
      [
        [-w / 2 + 1, -17],
        [-w / 2 + 8, -21],
        [w / 2 - 3, -16],
        [w / 2 - 9, -12],
      ],
      "#b0905b",
    );
    shape(
      ctx,
      [
        [-w / 2 + 2, -14],
        [w / 2 - 8, -9],
        [w / 2 - 9, 0],
        [-w / 2 + 3, -5],
      ],
      "#8c6b49",
    );
    ctx.strokeStyle = "#bd9960";
    ctx.lineWidth = 1;
    for (let y = -12; y <= -4; y += 4) {
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 3, y);
      ctx.lineTo(w / 2 - 9, y + 4);
      ctx.stroke();
    }
    for (let x = -w / 2 + 5; x < w / 2 - 8; x += 5) {
      ctx.fillStyle = "#604a39";
      ctx.fillRect(x, -12, 1, 9);
    }
    if (!done) {
      ctx.save();
      ctx.rotate(-0.36 + t * 0.3);
      ctx.fillStyle = "#553e35";
      ctx.fillRect(-3, -h, 6, 27);
      ctx.fillStyle = "#bc9864";
      ctx.fillRect(-1, -h, 3, 26);
      shape(
        ctx,
        [
          [-10, -h + 1],
          [8, -h + 3],
          [10, -h + 10],
          [-10, -h + 8],
        ],
        "#769499",
        hover,
      );
      ctx.fillStyle = "#c0c8b3";
      ctx.fillRect(-8, -h + 2, 13, 2);
      ctx.restore();
    }
  } else {
    shape(
      ctx,
      [
        [-w / 2, 0],
        [-w / 2, -24],
        [w / 2, -24],
        [w / 2, 0],
      ],
      "#977b58",
      hover,
    );
    ctx.fillStyle = "#e0c08b";
    ctx.fillRect(-w / 2 + 3, -22, w - 6, 3);
    ctx.fillStyle = done ? "#303f40" : "#e7d9b1";
    ctx.fillRect(-w / 2 + 4, -18, w - 8, 14);
    if (!done) {
      ctx.fillStyle = "#6d7563";
      ctx.fillRect(-7, -14, 15, 2);
      ctx.fillRect(-7, -9, 12, 2);
    }
  }
  ctx.restore();
}
