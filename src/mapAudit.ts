import { LEVELS } from "./campaign/levels";
import { WORLDS } from "./campaign/worldDesign";
import { CELL, type Polygon } from "./campaign/navigation";
import { buildWorldNavigation, allWorldFlags } from "./campaign/worldGeometry";
import type { Point } from "./campaign/types";

document.body.style.cssText =
  "margin:0;background:#101d25;color:#e4efe8;font:13px system-ui";
document.getElementById("audit")!.innerHTML =
  `<header style="padding:9px;display:flex;align-items:center;gap:14px;flex-wrap:wrap"><b>地图标定台 · 不读取或写入玩家存档</b><label>关卡 <select id="day">${LEVELS.map((l, i) => `<option value="${i}">DAY ${l.day} ${l.name}</option>`).join("")}</select></label><label><input id="floor" type="checkbox" checked>通行层</label><label><input id="anchors" type="checkbox" checked>物件 / 站位</label><label><input id="grid" type="checkbox" checked>坐标网格</label><label><input id="open" type="checkbox">机关全开</label><span id="point">点击地图检查坐标与路线</span></header><canvas id="map" width="1600" height="900" style="display:block;width:min(100%,1600px);height:auto;image-rendering:pixelated"></canvas>`;
const canvas = document.getElementById("map") as HTMLCanvasElement,
  ctx = canvas.getContext("2d")!;
let index = 0,
  background = new Image(),
  clicked: Point | null = null;
const checked = (id: string) =>
  (document.getElementById(id) as HTMLInputElement).checked;
function path(points: Polygon) {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}
function draw() {
  const w = WORLDS[index],
    level = LEVELS[index],
    nav = buildWorldNavigation(
      w,
      checked("open")
        ? allWorldFlags(
            w,
            level.puzzles.map((p) => p.id),
          )
        : new Set(),
    );
  ctx.clearRect(0, 0, 1600, 900);
  if (background.complete && background.naturalWidth)
    ctx.drawImage(background, 0, 0, 1600, 900);
  if (checked("floor")) {
    ctx.fillStyle = "#58dc9950";
    for (let i = 0; i < nav.cells.length; i++)
      if (nav.cells[i]) {
        const p = nav.center(i);
        ctx.fillRect(p.x - CELL / 2, p.y - CELL / 2, CELL, CELL);
      }
    nav.blockers.forEach((b) => {
      path(b);
      ctx.fillStyle = "#ff534845";
      ctx.fill();
      ctx.strokeStyle = "#fba79b";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }
  if (checked("grid")) {
    ctx.font = "13px monospace";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1600; x += 100) {
      ctx.strokeStyle = "#ffffff38";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 900);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(String(x), x + 3, 16);
    }
    for (let y = 100; y < 900; y += 100) {
      ctx.strokeStyle = "#ffffff38";
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1600, y);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.fillText(String(y), 3, y - 4);
    }
  }
  if (checked("anchors"))
    for (const [id, q] of Object.entries({
      ...w.positions,
      ...Object.fromEntries(w.mechanisms.map((m) => [m.id, m.position])),
    })) {
      ctx.fillStyle = "#ffe79b";
      ctx.fillRect(q.x - 4, q.y - 4, 8, 8);
      ctx.font = "12px monospace";
      ctx.fillStyle = "#172630";
      ctx.fillRect(q.x + 5, q.y - 19, id.length * 7.3 + 5, 18);
      ctx.fillStyle = "#fff6c5";
      ctx.fillText(id, q.x + 7, q.y - 5);
      const stance =
        w.approaches[id] ?? w.mechanisms.find((m) => m.id === id)!.approach;
      ctx.strokeStyle = nav.isWalkable(stance) ? "#bdfdff" : "#ff766c";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(stance.x, stance.y);
      ctx.stroke();
      ctx.strokeRect(stance.x - 6, stance.y - 6, 12, 12);
    }
  ctx.fillStyle = "#edf8ff";
  ctx.beginPath();
  ctx.arc(w.spawn.x, w.spawn.y, 8, 0, Math.PI * 2);
  ctx.fill();
  if (clicked) {
    const route = nav.route(w.spawn, clicked, () => false, 0);
    ctx.strokeStyle = "#fff6b5";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w.spawn.x, w.spawn.y);
    route.forEach((q) => ctx.lineTo(q.x, q.y));
    ctx.stroke();
    ctx.fillStyle = nav.isWalkable(clicked) ? "#9af5ac" : "#ff7d77";
    ctx.fillRect(clicked.x - 5, clicked.y - 5, 10, 10);
    document.getElementById("point")!.textContent =
      `${level.name} · (${clicked.x}, ${clicked.y}) · ${nav.isWalkable(clicked) ? "可走" : "障碍 / 无地面"} · 路径 ${route.length} 段`;
  }
}
function load() {
  index = Number((document.getElementById("day") as HTMLSelectElement).value);
  clicked = null;
  background = new Image();
  background.onload = draw;
  background.src = LEVELS[index].background;
}
document
  .querySelectorAll("input")
  .forEach((input) => input.addEventListener("change", draw));
document.getElementById("day")!.addEventListener("change", load);
canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  clicked = {
    x: Math.round(((e.clientX - r.left) / r.width) * 1600),
    y: Math.round(((e.clientY - r.top) / r.height) * 900),
  };
  draw();
});
load();
