import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { loadSource } from "../tests/load-source.mjs";

const { EXPLORATION_PACKS } = loadSource("src/campaign/exploration/packs.ts");
const { allDiscoveries, settleDiscovery, earnedAchievements } = loadSource("src/campaign/exploration/discoveries.ts");
const { WORLDS } = loadSource("src/campaign/worldDesign.ts");
const { LEVELS } = loadSource("src/campaign/levels.ts");
const { buildWorldNavigation, allWorldFlags } = loadSource("src/campaign/worldGeometry.ts");
const totals = { rooms: 0, outside: 0, inside: 0, rewards: 0, photos: 0, achievements: 0, animals: 0 };
const globalIds = new Set();

function png(src) {
  assert.ok(src.startsWith("/assets/"), `asset outside project assets: ${src}`);
  const data = readFileSync(`public${src}`);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", src);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), colourType: data[25] };
}
function route(nav, a, b, title) {
  assert.ok(nav.isWalkable(a) && nav.isWalkable(b), `${title}: non-floor stance`);
  const points = nav.route(a, b, () => false, 0);
  assert.ok(points.length, `${title}: no path`);
  assert.ok(Math.hypot(points.at(-1).x - b.x, points.at(-1).y - b.y) < .01, `${title}: snapped endpoint`);
  let last = a;
  for (const point of points) {
    assert.ok(nav.visible(last, point), `${title}: route crosses furniture`);
    last = point;
  }
}

assert.deepEqual(EXPLORATION_PACKS.map(p => p.day), [1,2,3,4,5,6,7,8]);
assert.equal(png("/assets/sprites/critters.png").colourType, 6, "animals must retain real RGBA transparency");
for (const pack of EXPLORATION_PACKS) {
  const errors = [];
  const check = (name, action) => { try { action(); } catch (error) { errors.push(`${name}: ${error.message}`); } };
  const nodes = allDiscoveries(pack), ids = new Set(nodes.map(n => n.id));
  const world = WORLDS[pack.day - 1], main = LEVELS[pack.day - 1];
  const mainNav = buildWorldNavigation(world, allWorldFlags(world, main.puzzles.map(p => p.id)));
  const initial = buildWorldNavigation(world, new Set());
  const indoor = buildWorldNavigation(pack.room.world, new Set());
  check("content budget", () => {
    assert.ok(pack.outside.length >= 3 && pack.room.nodes.length >= 6);
    assert.ok(nodes.filter(n => n.reward).length >= 3 && nodes.some(n => n.kind === "photo"));
    assert.ok(pack.achievements.length >= 2 && nodes.some(n => n.animal));
    assert.ok(existsSync(`docs/exploration-014/DAY${String(pack.day).padStart(2, "0")}.md`));
    assert.equal(ids.size, nodes.length);
    nodes.forEach(n => { assert.ok(!globalIds.has(n.id), n.id); globalIds.add(n.id); });
  });
  check("registered artwork", () => {
    const dimensions = png(pack.room.background);
    assert.ok(dimensions.width >= 1600 && dimensions.height >= 900);
    for (const n of nodes) {
      assert.ok(n.visual.support.length > 6 && (n.baked || n.art || n.animal), n.id);
      for (const art of [n.art, n.afterArt].filter(Boolean)) {
        const size = png(art.src), crop = art.crop ?? { x:0, y:0, ...size };
        assert.ok(crop.x >= 0 && crop.y >= 0 && crop.width > 0 && crop.height > 0, n.id);
        assert.ok(crop.x + crop.width <= size.width && crop.y + crop.height <= size.height, n.id);
      }
    }
  });
  check("outdoor doorway and optional points", () => {
    route(mainNav, world.spawn, pack.room.entry.approach, "entry");
    if (pack.room.entry.sharedTarget) assert.ok(world.approaches[pack.room.entry.sharedTarget], "missing original door target");
    for (const n of pack.outside) route(initial, world.spawn, n.approach, n.id);
  });
  check("all interior stance pairs and patrols", () => {
    const points = [pack.room.world.spawn, pack.room.world.approaches.exit, ...pack.room.nodes.map(n => n.approach)];
    for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) route(indoor, points[a], points[b], `${a}->${b}`);
    for (const n of nodes.filter(n => n.animal)) {
      const nav = pack.outside.includes(n) ? initial : indoor;
      const circuit = [n.position, ...(n.patrol ?? []), n.position];
      for (let i = 1; i < circuit.length; i++) route(nav, circuit[i-1], circuit[i], n.id);
    }
  });
  check("optional dependency and achievement logic", () => {
    const flags = new Set(), history = [];
    for (const n of nodes) {
      [...(n.requires ?? []), ...(n.sequence ?? [])].forEach(id => assert.ok(ids.has(id), `${n.id}->${id}`));
      (n.sequence ?? []).forEach(id => assert.ok(pack.room.nodes.some(x => x.id === id && x.kind === "inspect"), `${n.id}: sequence must reference room inspect nodes`));
      for (const missing of n.requires ?? []) {
        const partial = new Set((n.requires ?? []).filter(id => id !== missing));
        assert.equal(settleDiscovery(n, nodes, partial, []).status, "locked", `${n.id}: missing ${missing}`);
      }
    }
    for (let pass = 0; pass < nodes.length; pass++) for (const n of nodes) {
      if (flags.has(n.id) || (n.requires ?? []).some(id => !flags.has(id))) continue;
      for (const id of n.sequence ?? []) settleDiscovery(nodes.find(x => x.id === id), nodes, flags, history);
      settleDiscovery(n, nodes, flags, history);
    }
    assert.equal(flags.size, nodes.length, "cyclic or unsatisfiable optional dependency");
    for (const n of nodes) assert.equal(settleDiscovery(n, nodes, flags, history).status, "repeat");
    assert.equal(earnedAchievements(pack, flags).length, pack.achievements.length);
    for (const a of pack.achievements) for (const missing of a.requires) {
      const partial = new Set(flags); partial.delete(missing);
      assert.ok(!earnedAchievements(pack, partial).some(x => x.id === a.id), `${a.id}: unlocked without ${missing}`);
    }
  });
  const count = { rooms:1, outside:pack.outside.length, inside:pack.room.nodes.length,
    rewards:nodes.filter(n => n.reward).length, photos:nodes.filter(n => n.kind === "photo").length,
    achievements:pack.achievements.length, animals:nodes.filter(n => n.animal).length };
  Object.keys(totals).forEach(key => totals[key] += count[key]);
  console.log(JSON.stringify({ day:pack.day, room:pack.room.name, ...count, errors }));
  if (errors.length) process.exitCode = 1;
}
console.log(JSON.stringify({ total:totals, scope:"asset/header/crop/dependency/exact-navigation checks; browser visual QA is separate" }));
