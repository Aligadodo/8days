import { LEVELS } from "./campaign/levels";
import { WORLDS } from "./campaign/worldDesign";
import { CELL, type Polygon } from "./campaign/navigation";
import { buildWorldNavigation, allWorldFlags } from "./campaign/worldGeometry";
import type { Point } from "./campaign/types";
import { entitiesFor, entityDepth, type Entity } from "./campaign/entities";
import { SpriteAtlas } from "./campaign/SpriteAtlas";
import { SceneRaster } from "./campaign/SceneRaster";
import { mechanismOpen } from "./campaign/worldGeometry";
import { drawMechanism, drawMechanismPatch, drawSurface, hitMechanism } from "./campaign/mechanismRendering";
import { drawBakedObject, drawPlacedSprite } from "./campaign/objectRendering";
import { contains } from "./campaign/navigation";

document.body.style.cssText =
  "margin:0;background:#101d25;color:#e4efe8;font:13px system-ui";
document.getElementById("audit")!.innerHTML =
  `<header style="padding:9px;display:flex;align-items:center;gap:14px;flex-wrap:wrap"><b>地图标定台 · 不读取或写入玩家存档</b><label>关卡 <select id="day">${LEVELS.map((l, i) => `<option value="${i}">DAY ${l.day} ${l.name}</option>`).join("")}</select></label><label><input id="floor" type="checkbox" checked>通行层</label><label><input id="anchors" type="checkbox" checked>物件 / 站位</label><label><input id="grid" type="checkbox" checked>坐标网格</label><label><input id="open" type="checkbox">机关全开</label><span id="point">点击地图检查坐标与路线</span></header><canvas id="map" width="1600" height="900" style="display:block;width:min(100%,1600px);height:auto;image-rendering:pixelated"></canvas>`;
const canvas = document.getElementById("map") as HTMLCanvasElement,
  ctx = canvas.getContext("2d")!;
const label = document.createElement("label");
label.innerHTML = '<input id="art" type="checkbox" checked>实际物件素材';
document.querySelector("header")!.append(label);
const cacheLabel = document.createElement("label");
cacheLabel.innerHTML = '<input id="keep-cache" type="checkbox">开墙未取收藏';
document.querySelector("header")!.append(cacheLabel);
const parameters = new URLSearchParams(location.search);
(document.getElementById("day") as HTMLSelectElement).value = String(Math.max(0, Math.min(7, Number(parameters.get("day")) || 0)));
for (const id of ["open", "keep-cache"])
  (document.getElementById(id) as HTMLInputElement).checked = parameters.get(id) === "1";
const atlas = new SpriteAtlas(), raster = new SceneRaster();
let hovering: Entity | null = null;
if (new URLSearchParams(location.search).has("visual"))
  ["floor", "grid", "anchors"].forEach(id => (document.getElementById(id) as HTMLInputElement).checked = false);
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
function reviewFlags() {
  const w = WORLDS[index], flags = checked("open") || checked("keep-cache")
    ? allWorldFlags(w, LEVELS[index].puzzles.map(p => p.id)) : new Set<string>();
  if (checked("keep-cache"))
    for (const m of w.mechanisms) if (m.kind === "cache") flags.delete(m.id);
  return flags;
}
function rememberView() {
  const url = new URL(location.href);
  url.searchParams.set("day", (document.getElementById("day") as HTMLSelectElement).value);
  for (const id of ["open", "keep-cache"]) url.searchParams.set(id, checked(id) ? "1" : "0");
  history.replaceState(null, "", url);
}
function draw() {
  const w = WORLDS[index],
    level = LEVELS[index],
    flags = reviewFlags(),
    nav = buildWorldNavigation(w, flags);
  ctx.clearRect(0, 0, 1600, 900);
  if (background.complete && background.naturalWidth)
    ctx.drawImage(background, 0, 0, 1600, 900);
  if (checked("art")) {
    for (const surface of w.surfaces)
      if (!surface.requires || flags.has(surface.requires)) drawSurface(ctx, raster, surface);
    const entities = entitiesFor(level).filter(e => e.mechanism?.kind !== "cache" ||
      (e.mechanism.requires ?? []).every(id => flags.has(id)));
    for (const e of entities)
      if (e.mechanism) drawMechanismPatch(ctx, raster, e.mechanism, mechanismOpen(e.mechanism, flags));
    const redraw = () => {
      if (background.complete && background.naturalWidth) ctx.drawImage(background, 0, 0, 1600, 900);
      for (const surface of w.surfaces)
        if (!surface.requires || flags.has(surface.requires)) drawSurface(ctx, raster, surface);
      for (const entity of entities)
        if (entity.mechanism) drawMechanismPatch(ctx, raster, entity.mechanism, mechanismOpen(entity.mechanism, flags));
    };
    entities.sort((a, b) => entityDepth(a) - entityDepth(b)).forEach(e => {
      const done = e.mechanism ? mechanismOpen(e.mechanism, flags) : checked("open") || checked("keep-cache");
      if (e.mechanism) drawMechanism(ctx, raster, e.mechanism, done, 0, hovering?.id === e.id, 99, true, redraw);
      else if (e.baked) drawBakedObject(ctx, e, done, hovering?.id === e.id, redraw);
      else drawPlacedSprite(ctx, atlas, e, e, done && e.doneFrame !== undefined ? e.doneFrame : e.frame,
        hovering?.id === e.id, level.environment);
    });
  }
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
  if (checked("anchors")) {
  ctx.fillStyle = "#edf8ff";
  ctx.beginPath();
  ctx.arc(w.spawn.x, w.spawn.y, 8, 0, Math.PI * 2);
  ctx.fill();
  }
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
  rememberView();
  index = Number((document.getElementById("day") as HTMLSelectElement).value);
  clicked = null;
  background = new Image();
  background.onload = draw;
  background.src = LEVELS[index].background;
}
document
  .querySelectorAll("input")
  .forEach((input) => input.addEventListener("change", () => { rememberView(); draw(); }));
document.getElementById("day")!.addEventListener("change", load);
canvas.addEventListener("click", (e) => {
  const r = canvas.getBoundingClientRect();
  clicked = {
    x: Math.round(((e.clientX - r.left) / r.width) * 1600),
    y: Math.round(((e.clientY - r.top) / r.height) * 900),
  };
  draw();
});
canvas.addEventListener("pointermove", (event) => {
  const r = canvas.getBoundingClientRect(), q = { x: (event.clientX - r.left) / r.width * 1600,
    y: (event.clientY - r.top) / r.height * 900 };
  const flags = reviewFlags();
  const next = entitiesFor(LEVELS[index]).sort((a, b) => entityDepth(b) - entityDepth(a)).find(e => {
    if (e.mechanism?.kind === "cache" && !(e.mechanism.requires ?? []).every(id => flags.has(id))) return false;
    if (e.mechanism) return hitMechanism(raster, e.mechanism, mechanismOpen(e.mechanism, flags), q);
    if (e.baked) return contains(q, e.baked);
    return atlas.hit(e.atlas, checked("open") && e.doneFrame !== undefined ? e.doneFrame : e.frame,
      e.height, q.x - e.x, q.y - e.y, e.visual?.maxWidth);
  }) ?? null;
  if (next?.id !== hovering?.id) {
    hovering = next;
    document.getElementById("point")!.textContent = next ? `${next.name} · ${next.visual?.support ?? "缺少支撑说明"}` : "悬停物件检查轮廓，点击检查地面";
    canvas.style.cursor = next ? "pointer" : "default";
    draw();
  }
});
Promise.all([atlas.ready, ...WORLDS.flatMap(w => w.mechanisms.flatMap(m =>
  [m.art?.closed, m.art?.open].filter(a => a !== undefined).map(a => raster.preload(a)),
)), ...WORLDS.flatMap(w => w.surfaces.flatMap(s => [s.art, ...(s.variants ?? [])]
  .filter(a => a !== undefined).map(a => raster.preload(a))))
]).then(draw).catch(() => document.getElementById("point")!.textContent = "素材加载失败，请检查控制台与文件路径");
load();
