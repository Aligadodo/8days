import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { loadSource } from "./load-source.mjs";

const { LIFE_PACKS, lifeNodesFor } = loadSource("src/campaign/life/packs.ts");
const { EXPLORATION_PACKS } = loadSource("src/campaign/exploration/packs.ts");
const { WORLDS } = loadSource("src/campaign/worldDesign.ts");
const { LEVELS } = loadSource("src/campaign/levels.ts");
const { buildWorldNavigation, allWorldFlags } = loadSource("src/campaign/worldGeometry.ts");
const tables = new Set(["salvage", "nature", "pantry", "mineral", "pocket", "cloth", "herbs", "fruit", "stone", "wood", "paper", "tea"]);

test("v0.15 registers all eight days with unique native life objects", () => {
  assert.deepEqual(LIFE_PACKS.map(p => p.day).sort((a,b)=>a-b), [1,2,3,4,5,6,7,8]);
  const nodes = LIFE_PACKS.flatMap(p => [...p.outside, ...p.inside]);
  assert.equal(new Set(nodes.map(n=>n.id)).size, nodes.length);
});

for (const pack of LIFE_PACKS) for (const inside of [false,true]) {
  const label = `DAY ${pack.day} ${inside ? "inside" : "outside"}`;
  const nodes = lifeNodesFor(pack.day, inside);
  const exploration = EXPLORATION_PACKS.find(p=>p.day===pack.day);
  const discoveries = inside ? exploration.room.nodes : exploration.outside;
  const world = inside ? exploration.room.world : WORLDS[pack.day-1];
  test(`${label}: authored props, lifecycle and asset contract`, () => {
    assert.ok(nodes.length>=6, "each scene needs six meaningful life objects");
    // Some outdoor paintings contain no genuine storage container. Do not reward invented boxes.
    const requiredKinds = !inside && [4,6].includes(pack.day) ? ["gather","inspect"] : ["container","gather","inspect"];
    for (const kind of requiredKinds)
      assert.ok(nodes.some(n=>n.kind===kind), `${kind} missing`);
    for (const n of nodes) {
      assert.ok(n.id.startsWith(`d${String(pack.day).padStart(2,"0")}-life-`),n.id);
      assert.ok(n.title.length>1 && n.description.length>8 && n.emptyText.length>3,n.id);
      assert.ok(n.visual.support.length>8,n.id);
      assert.ok(n.baked.length>=3,n.id);
      const points = [...n.baked,n.position,n.approach];
      assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1600&&p.y>=0&&p.y<=900),n.id);
      if(n.kind!=="inspect") assert.ok(tables.has(n.lootTable),n.id);
      if(n.kind==="gather") assert.ok(Number.isFinite(n.renewSeconds)&&n.renewSeconds>=180,n.id);
      if(n.sharedDiscovery) {
        const shared = discoveries.find(d=>d.id===n.sharedDiscovery);
        assert.ok(shared, `${n.id}: shared object in wrong scene`);
        assert.deepEqual(n.approach,shared.approach,`${n.id}: shared hotspot unexpectedly needs a second stance`);
      }
      if(n.afterArt) {
        assert.ok(n.afterArt.src.startsWith("/assets/life-015/"),n.id);
        const path = `public${n.afterArt.src}`;
        assert.ok(existsSync(path),path);
        const bytes = readFileSync(path);
        assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
        const size={width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
        const c=n.afterArt.crop;
        if(c) assert.ok(c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.x+c.width<=size.width&&c.y+c.height<=size.height,n.id);
      }
    }
  });
  test(`${label}: exact approach points are connected with collision-safe route segments`, () => {
    const flags = inside ? new Set() : allWorldFlags(world,LEVELS[pack.day-1].puzzles.map(p=>p.id));
    const nav = buildWorldNavigation(world,flags);
    for(const n of nodes) {
      assert.ok(nav.isWalkable(n.approach),`${n.id}: feet inside obstacle`);
      const route=nav.route(world.spawn,n.approach,()=>false,0);
      assert.ok(route.length,`${n.id}: disconnected stance`);
      assert.deepEqual(route.at(-1),n.approach,`${n.id}: snapped instead of authored`);
      let previous=world.spawn;
      for(const next of route) { assert.ok(nav.visible(previous,next),`${n.id}: route cuts obstacle`); previous=next; }
    }
  });
}
