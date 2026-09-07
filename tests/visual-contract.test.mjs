import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { loadSource } from "./load-source.mjs";

const { WORLDS } = loadSource("src/campaign/worldDesign.ts");
const { LEVELS } = loadSource("src/campaign/levels.ts");
const { entitiesFor, entityDepth, hasGroundShadow } = loadSource("src/campaign/entities.ts");
const { SceneRaster, artBounds } = loadSource("src/campaign/SceneRaster.ts");
const { drawMechanism, hitMechanism, mechanismArt, drawSurface } = loadSource("src/campaign/mechanismRendering.ts");
const { drawBakedObject } = loadSource("src/campaign/objectRendering.ts");
const { SpriteAtlas } = loadSource("src/campaign/SpriteAtlas.ts");

// This is a data/rendering contract, NOT a judgment of taste, perspective,
// support-plane correctness or the beauty of an image. Those require image QA.
const mounts = new Set(["ground", "wall", "table", "hanging", "actor", "door"]);
const atlases = new Set(["world-props", "life-actors", "utility-props"]);
const publicRoot = resolve("public");
const pngCache = new Map();

function finite(value, label) {
  assert.equal(typeof value, "number", `${label} must be numeric`);
  assert.ok(Number.isFinite(value), `${label} must be finite`);
}
function point(value, label, inWorld = true) {
  assert.ok(value, `${label} is missing`);
  finite(value.x, `${label}.x`);
  finite(value.y, `${label}.y`);
  if (inWorld) {
    assert.ok(value.x >= 0 && value.x <= 1600, `${label}.x leaves the painting`);
    assert.ok(value.y >= 0 && value.y <= 900, `${label}.y leaves the painting`);
  }
}
function visual(value, label) {
  assert.ok(value, `${label}: missing explicit visual contract`);
  assert.ok(mounts.has(value.mount), `${label}: invalid mount`);
  assert.equal(typeof value.support, "string", `${label}: missing support description`);
  assert.ok(value.support.trim().length >= 6, `${label}: describe the actual support, not just its type`);
  assert.doesNotMatch(value.support, /TODO|TBD|placeholder|待定|占位/i, `${label}: unresolved support`);
  for (const key of ["height", "maxWidth"]) {
    if (value[key] !== undefined) {
      finite(value[key], `${label}.${key}`);
      assert.ok(value[key] > 0, `${label}.${key} must be positive`);
    }
  }
  if (value.depth !== undefined) finite(value.depth, `${label}.depth`);
  if (value.layer !== undefined) assert.ok(["ground", "actor"].includes(value.layer), `${label}: invalid layer`);
  if (value.atlas !== undefined) assert.ok(atlases.has(value.atlas), `${label}: invalid atlas`);
  if (value.frame !== undefined) assert.ok(Number.isInteger(value.frame) && value.frame >= 0 && value.frame < 16, `${label}: invalid atlas frame`);
}
function baked(value, label) {
  assert.ok(Array.isArray(value) && value.length >= 3, `${label}: polygon needs at least 3 vertices`);
  value.forEach((p, i) => point(p, `${label}[${i}]`));
  const area2 = value.reduce((sum, p, i) => {
    const q = value[(i + 1) % value.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  assert.ok(Math.abs(area2) > 1, `${label}: collapsed hit polygon`);
  assert.ok(new Set(value.map((p) => `${p.x},${p.y}`)).size >= 3, `${label}: repeated vertices only`);
}
function pngInfo(src, label) {
  assert.equal(typeof src, "string", `${label}: missing source URL`);
  assert.ok(src.startsWith("/assets/"), `${label}: source must be a versioned public asset`);
  assert.doesNotMatch(src, /[?#]/, `${label}: source must resolve deterministically`);
  const file = resolve(publicRoot, `.${src}`);
  const rel = relative(publicRoot, file);
  assert.ok(rel && !rel.startsWith(`..${sep}`) && rel !== "..", `${label}: asset escapes public directory`);
  assert.ok(existsSync(file), `${label}: missing ${src}`);
  if (!pngCache.has(file)) {
    const buffer = readFileSync(file);
    assert.ok(buffer.length >= 33, `${label}: truncated image`);
    assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${label}: scene raster must be a PNG, not an SVG/icon placeholder`);
    assert.equal(buffer.toString("ascii", 12, 16), "IHDR", `${label}: missing PNG header`);
    pngCache.set(file, { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });
  }
  return pngCache.get(file);
}
function art(value, anchor, label) {
  assert.ok(value, `${label}: missing art state`);
  const size = pngInfo(value.src, label);
  for (const key of ["width", "height"]) {
    finite(value[key], `${label}.${key}`);
    assert.ok(value[key] > 0, `${label}.${key} must be positive`);
  }
  assert.ok(value.width <= 1600 && value.height <= 900, `${label}: art exceeds the painting size`);
  if (value.offset !== undefined) point(value.offset, `${label}.offset`, false);
  if (value.crop) {
    const c = value.crop;
    for (const key of ["x", "y", "width", "height"]) assert.ok(Number.isInteger(c[key]), `${label}.crop.${key} must be an integer pixel`);
    assert.ok(c.x >= 0 && c.y >= 0 && c.width > 0 && c.height > 0, `${label}: invalid crop`);
    assert.ok(c.x + c.width <= size.width && c.y + c.height <= size.height, `${label}: crop exceeds ${size.width} × ${size.height}`);
  }
  const bounds = artBounds(value, anchor);
  assert.ok(bounds.x < 1600 && bounds.x + bounds.w > 0 && bounds.y < 900 && bounds.y + bounds.h > 0, `${label}: art is entirely outside the map`);
}

test("visual audit inventory covers all 56 original targets and all 7 mechanisms", () => {
  assert.equal(WORLDS.length, 8);
  assert.equal(LEVELS.reduce((n, l) => n + l.puzzles.length + l.sideTasks.length + 1, 0), 56);
  assert.equal(WORLDS.reduce((n, w) => n + w.mechanisms.length, 0), 7);
});

for (const [index, world] of WORLDS.entries()) {
  const label = `DAY ${index + 1}`;
  const level = LEVELS[index];
  const ids = [...level.puzzles, ...level.sideTasks].map((q) => q.id).concat("exit");
  test(`${label}: every original target has a real support contract and a registered visual`, () => {
    assert.deepEqual(Object.keys(world.visuals).sort(), [...ids].sort(), `${label}: missing/orphaned visual metadata`);
    assert.deepEqual(Object.keys(world.positions).sort(), [...ids].sort(), `${label}: missing/orphaned anchors`);
    assert.deepEqual(Object.keys(world.approaches).sort(), [...ids].sort(), `${label}: missing/orphaned stances`);
    for (const id of Object.keys(world.baked)) assert.ok(ids.includes(id), `${label}: orphaned baked target ${id}`);
    for (const id of ids) {
      const name = `${label}/${id}`;
      visual(world.visuals[id], name);
      point(world.positions[id], `${name}.position`);
      point(world.approaches[id], `${name}.approach`);
      if (world.baked[id]) baked(world.baked[id], `${name}.baked`);
      const entity = entitiesFor(level).find((e) => e.id === id);
      assert.ok(entity, `${name}: no runtime entity`);
      assert.deepEqual(entity.visual, world.visuals[id], `${name}: runtime lost mount/depth information`);
      assert.deepEqual(entity.baked, world.baked[id], `${name}: runtime lost background binding`);
      assert.ok(atlases.has(entity.atlas), `${name}: unknown atlas`);
      if (world.visuals[id].atlas !== undefined) assert.equal(entity.atlas, world.visuals[id].atlas, `${name}: ignored atlas override`);
      if (world.visuals[id].frame !== undefined) assert.equal(entity.frame, world.visuals[id].frame, `${name}: ignored frame override`);
      pngInfo(`/assets/sprites/${entity.atlas}.png`, name);
    }
  });
  test(`${label}: mechanisms use authored closed/open assets instead of geometric placeholder furniture`, () => {
    const flags = new Set([...level.puzzles.map((q) => q.id), ...world.mechanisms.map((m) => m.id)]);
    assert.equal(new Set(world.mechanisms.map((m) => m.id)).size, world.mechanisms.length, `${label}: repeated mechanism id`);
    for (const m of world.mechanisms) {
      const name = `${label}/${m.id}`;
      visual(m.visual, name);
      point(m.position, `${name}.position`);
      point(m.approach, `${name}.approach`);
      assert.ok(m.baked || m.art?.closed, `${name}: closed body has no authored art`);
      if (m.baked) baked(m.baked, `${name}.baked`);
      for (const state of ["closed", "open"]) if (m.art?.[state]) art(m.art[state], m.position, `${name}.${state}`);
      if (m.kind === "gate" || m.kind === "breakable") {
        assert.ok(m.art?.open, `${name}: opening must have an authored open state, not a black rectangle/vanishing background wall`);
        assert.notDeepEqual(m.art.open, m.art.closed, `${name}: open state cannot be identical to closed state`);
      }
      if (m.kind === "gate") assert.ok(flags.has(m.controlledBy), `${name}: unknown controlling state`);
      for (const id of m.requires ?? []) assert.ok(flags.has(id), `${name}: unknown prerequisite ${id}`);
    }
  });
}

test("shared support depth and shadow rules distinguish ground marks, mounted items and actors", () => {
  const entity = { x: 100, y: 200, height: 70, visual: { mount: "ground", support: "test ground" } };
  assert.equal(entityDepth(entity), 200);
  assert.equal(entityDepth({ ...entity, visual: { ...entity.visual, depth: 250 } }), 250);
  assert.equal(entityDepth({ ...entity, visual: { ...entity.visual, depth: 250, layer: "ground" } }), -1);
  assert.equal(hasGroundShadow(entity), true);
  assert.equal(hasGroundShadow({ ...entity, visual: { ...entity.visual, mount: "actor" } }), true);
  for (const mount of ["wall", "table", "hanging", "door"]) assert.equal(hasGroundShadow({ ...entity, visual: { ...entity.visual, mount } }), false, `${mount}: no floating floor ellipse`);
  assert.equal(hasGroundShadow({ ...entity, visual: { ...entity.visual, layer: "ground" } }), false);
  assert.equal(hasGroundShadow({ ...entity, baked: [{ x: 0, y: 0 }] }), false, "background already has its own contact shadow");
});

test("raster hit and draw share exact crop registration, respect alpha and do not invent missing art hitboxes", () => {
  const raster = new SceneRaster();
  const picture = { src: "/assets/test-fixture.png", width: 40, height: 30, offset: { x: 5, y: -3 } };
  const anchor = { x: 100, y: 200 };
  const bounds = artBounds(picture, anchor);
  assert.deepEqual(bounds, { x: 85, y: 167, w: 40, h: 30 });
  assert.equal(raster.hit(picture, anchor, { x: 90, y: 170 }), false);
  const frame = { image: { width: 2, height: 2 }, mask: {}, pixels: new Uint8ClampedArray(16) };
  frame.pixels[3] = 255;
  frame.pixels[15] = 255;
  raster.frames.set(`${picture.src}:null`, frame);
  assert.equal(raster.hit(picture, anchor, { x: 90, y: 170 }), true);
  assert.equal(raster.hit(picture, anchor, { x: 110, y: 170 }), false, "transparent upper right is not clickable");
  assert.equal(raster.hit(picture, anchor, { x: 90, y: 190 }), false, "transparent lower left is not clickable");
  assert.equal(raster.hit(picture, anchor, { x: 110, y: 190 }), true);
  assert.equal(raster.hit(picture, anchor, { x: 130, y: 190 }), false);
  const calls = [];
  const ctx = { save() {}, restore() {}, drawImage(...args) { calls.push(args); } };
  raster.draw(ctx, picture, anchor);
  assert.deepEqual(calls, [[frame.image, bounds.x, bounds.y, bounds.w, bounds.h]]);
  calls.length = 0;
  raster.draw(ctx, picture, anchor, true);
  assert.equal(calls.length, 5, "hover adds only four thin alpha silhouettes plus the original image");
  assert.deepEqual(calls.at(-1), [frame.image, bounds.x, bounds.y, bounds.w, bounds.h]);
});

test("missing mechanism art cannot fall back to flat bookcases, levers, walls, baskets or clickable rectangles", () => {
  const bodyCalls = [];
  const ctx = new Proxy({}, { get: (_, method) => (...args) => bodyCalls.push([method, ...args]) });
  const raster = { draw: (...args) => bodyCalls.push(["raster", ...args]), hit: () => false };
  for (const kind of ["gate", "lever", "breakable", "tool", "cache"]) {
    const m = { id: `no-art-${kind}`, kind, position: { x: 100, y: 100 }, width: 80, height: 80 };
    for (const done of [false, true]) {
      drawMechanism(ctx, raster, m, done, 0, false, 99);
      assert.equal(hitMechanism(raster, m, done, { x: 100, y: 60 }), false);
    }
  }
  assert.deepEqual(bodyCalls, []);
  const closed = { src: "closed.png" }, open = { src: "open.png" };
  assert.equal(mechanismArt({ art: { closed, open } }, false), closed);
  assert.equal(mechanismArt({ art: { closed, open } }, true), open);
});

test("baked objects redraw their actual body at the authored depth, clipped before state and hover effects", () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, method) => (...args) => calls.push([method, ...args]) });
  const entity = { id: "turn-off-screen", baked: [{ x: 10, y: 20 }, { x: 40, y: 20 }, { x: 40, y: 50 }, { x: 10, y: 50 }] };
  drawBakedObject(ctx, entity, true, true, () => calls.push(["actual-background-body"]));
  const methods = calls.map(([method]) => method);
  assert.equal(methods[0], "save");
  assert.equal(methods.at(-1), "restore");
  const clip = methods.indexOf("clip"), body = methods.indexOf("actual-background-body"), state = methods.indexOf("fill"), hover = methods.indexOf("stroke");
  assert.ok(clip > 0 && body > clip, "a sort key alone is not enough: real body must be redrawn inside the polygon");
  assert.ok(state > body && hover > body, "redrawing must not wipe completed-state or hover feedback");
  calls.length = 0;
  drawBakedObject(ctx, { id: "not-baked" }, false, false, () => calls.push(["unexpected-background-copy"]));
  assert.deepEqual(calls, []);
});

test("unloaded atlas sprites cannot create invisible clickable rectangles", () => {
  // Avoid image/network work; exercise the real hit method with an empty frame cache.
  const atlas = Object.create(SpriteAtlas.prototype);
  atlas.frames = new Map();
  assert.equal(atlas.hit("world-props", 2, 70, 0, -30), false);
  assert.equal(atlas.hit("utility-props", 7, 55, 4, -20), false);
});

test("new walkable surfaces use authored raster stones/planks rather than continuous flat pavement", () => {
  for (const [index, world] of WORLDS.entries()) {
    for (const surface of world.surfaces) {
      const label = `DAY ${index + 1}/${surface.name}`;
      assert.ok(surface.art, `${label}: missing authored surface raster`);
      assert.ok(surface.path.length >= 2, `${label}: surface needs a route`);
      surface.path.forEach(([x, y], i) => point({ x, y }, `${label}.path[${i}]`));
      const [x, y] = surface.path[0];
      if (surface.art) art(surface.art, { x, y }, `${label}.art`);
      for (const [i, variant] of (surface.variants ?? []).entries()) art(variant, { x, y }, `${label}.variants[${i}]`);
      if (surface.spacing !== undefined) {
        finite(surface.spacing, `${label}.spacing`);
        assert.ok(surface.spacing > 0, `${label}: spacing must be positive`);
      }
    }
  }
  const calls = [];
  const ctx = new Proxy({}, { get: (_, method) => (...args) => calls.push([method, ...args]) });
  const raster = { draw: (...args) => calls.push(["raster", ...args]) };
  drawSurface(ctx, raster, { name: "missing-raster-fixture", path: [[10, 10], [90, 90]], width: 40, material: "stone" });
  assert.deepEqual(calls, [], "missing surface art must not silently recreate a gray strip over water");
});

test("background-bound mechanisms redraw their real state inside the body outline and stop taking clicks when complete", () => {
  const calls = [];
  const ctx = new Proxy({}, { get: (_, method) => (...args) => calls.push([method, ...args]) });
  const raster = { draw: () => calls.push(["unexpected-independent-sprite"]), hit: () => true };
  const m = { id: "baked-door-fixture", kind: "gate", position: { x: 40, y: 60 }, width: 40, height: 50,
    baked: [{ x: 20, y: 10 }, { x: 60, y: 10 }, { x: 60, y: 60 }, { x: 20, y: 60 }] };
  for (const done of [false, true]) {
    calls.length = 0;
    drawMechanism(ctx, raster, m, done, 0, true, 99, false, () => calls.push(["current-background-and-open-patches"]));
    const methods = calls.map(([name]) => name);
    assert.ok(methods.indexOf("clip") >= 0 && methods.indexOf("current-background-and-open-patches") > methods.indexOf("clip"));
    assert.equal(methods.includes("unexpected-independent-sprite"), false);
    assert.equal(methods.includes("stroke"), !done, "completed door must not retain an interactive closed outline");
    assert.equal(hitMechanism(raster, m, done, { x: 40, y: 35 }), !done);
  }
});
