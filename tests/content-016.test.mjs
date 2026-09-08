import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./load-source.mjs";

const { LIFE_PACKS } = loadSource("src/campaign/life/packs.ts");
const { WORLDS } = loadSource("src/campaign/worldDesign.ts");
const { EXPLORATION_PACKS } = loadSource("src/campaign/exploration/packs.ts");
const { buildWorldNavigation } = loadSource("src/campaign/worldGeometry.ts");

test("DAY01 offers a real renewable source near arrival, without moving the spawn or opening walls", () => {
  const world = WORLDS[0], node = LIFE_PACKS[0].outside.find(n => n.id === "d01-life-apartment-cuttings");
  assert.ok(node);
  assert.equal(node.kind, "gather");
  assert.equal(node.lootTable, "cloth");
  assert.ok(Math.hypot(world.spawn.x - node.approach.x, world.spawn.y - node.approach.y) < 90,
    "first optional pickup should be discoverable beside the arrival pavement");
  const nav = buildWorldNavigation(world, new Set());
  const route = nav.route(world.spawn, node.approach, () => false, 0);
  assert.ok(route.length);
  assert.deepEqual(route.at(-1), node.approach);
  let previous = world.spawn;
  for (const step of route) { assert.ok(nav.visible(previous, step)); previous = step; }
});

test("new city supplies retain real plant and cup identities, not duplicate scene furniture", () => {
  const shop = LIFE_PACKS[0].inside.find(n => n.id === "d01-life-postcard-cuttings");
  assert.equal(shop.kind, "gather");
  assert.equal(shop.lootTable, "herbs");
  const nav = buildWorldNavigation(EXPLORATION_PACKS[0].room.world, new Set());
  assert.ok(nav.isWalkable(shop.approach));
  for (const [side, id, discovery] of [
    ["outside", "d02-life-shared-tea", "d02-last-cup"],
    ["inside", "d02-life-lounge-refill", "d02-tea-pause"],
  ]) {
    const node = LIFE_PACKS[1][side].find(n => n.id === id);
    const originals = side === "inside" ? EXPLORATION_PACKS[1].room.nodes : EXPLORATION_PACKS[1].outside;
    const original = originals.find(n => n.id === discovery);
    assert.equal(node.kind, "gather");
    assert.equal(node.lootTable, "tea");
    assert.equal(node.sharedDiscovery, original.id);
    assert.deepEqual(node.baked, original.baked);
    assert.deepEqual(node.approach, original.approach);
    assert.equal(node.renewSeconds, 300);
  }
});
