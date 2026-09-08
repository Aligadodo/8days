import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./load-source.mjs";

const { LIFE_PACKS } = loadSource("src/campaign/life/packs.ts");
const { EXPLORATION_PACKS } = loadSource("src/campaign/exploration/packs.ts");
const { createLife, restoreLife, collectLife, lifeAvailable } = loadSource("src/campaign/life/runtime.ts");
const { createEconomy } = loadSource("src/campaign/life/economy.ts");
const { LOOT_TABLES } = loadSource("src/campaign/life/catalog.ts");
const { restoreCampaignSave } = loadSource("src/campaign/campaignSave.ts");
const additions = [
  [3,"outside","d03-life-roadside-petals","cloth"], [3,"inside","d03-life-tool-pot-cuttings","herbs"],
  [4,"outside","d04-life-step-seam","stone"], [4,"inside","d04-life-partition-pot","cloth"],
  [5,"outside","d05-life-orchard-path-leaves","cloth"], [5,"inside","d05-life-desk-right-drawer","paper"],
  [6,"outside","d06-life-rain-petal-fiber","cloth"],
  [7,"outside","d07-life-fir-needles","cloth"], [7,"inside","d07-life-east-planter-clippings","cloth"],
  [8,"outside","d08-life-east-rock-samples","stone"], [8,"inside","d08-life-right-tin","mineral"],
];
const nodes=LIFE_PACKS.flatMap(pack=>[...pack.outside,...pack.inside]);

test("v0.16 DAY03–08 adds eleven renewable sources without forcing loot out of DAY06 private shelter props",()=>{
  assert.equal(additions.length,11);
  for(const pack of LIFE_PACKS.filter(pack=>pack.day>=3))for(const scene of ["outside","inside"]){
    const expected=pack.day===6&&scene==="inside"?2:3;
    assert.equal(pack[scene].filter(node=>node.kind==="gather").length,expected,`DAY ${pack.day} ${scene}`);
  }
  for(const [day,scene,id,pool] of additions){
    const node=LIFE_PACKS[day-1][scene].find(node=>node.id===id);
    assert.ok(node,id);assert.equal(node.kind,"gather",id);assert.equal(node.lootTable,pool,id);
    assert.ok(node.renewSeconds>=300,id);
    if(node.sharedDiscovery){
      const pack=EXPLORATION_PACKS[day-1], legacy=(scene==="inside"?pack.room.nodes:pack.outside).find(d=>d.id===node.sharedDiscovery);
      assert.ok(legacy);assert.deepEqual(node.approach,legacy.approach);
      assert.deepEqual(node.baked,legacy.baked,"new gathering must not invent a second invisible hotspot");
      assert.ok(!legacy.requires?.length&&!legacy.sequence?.length,"gathering may not bypass a prerequisite discovery");
    }
    const state=createLife(),economy=createEconomy(), first=collectLife(state,economy,node);
    assert.equal(first.status,"new",id);
    const allowed=new Set(LOOT_TABLES[pool].map(row=>row.id));
    assert.ok(first.rewards.filter(reward=>reward.id!=="coin").every(reward=>allowed.has(reward.id)),id);
    const snapshot=JSON.stringify(economy);
    assert.equal(collectLife(state,economy,node).status,"empty");assert.equal(JSON.stringify(economy),snapshot);
    state.activeSeconds=state.gathered[id].readyAt;
    assert.equal(collectLife(state,economy,node).status,"new");assert.equal(state.gathered[id].cycle,2);
  }
  for(const id of ["d06-life-stove","d06-life-stove-poker","d06-life-door-latch","d07-life-suitcase","d03-life-hive-left","d03-life-hive-middle"])
    assert.equal(nodes.find(node=>node.id===id).kind,"inspect",`${id}: protected objects stay non-consumable`);
});

for(const id of ["d05-life-desk-right-drawer","d08-life-right-tin"])test(`v0.16 ${id}: old once-only claim becomes a full cooldown, not an update-time bonus`,()=>{
  const node=nodes.find(node=>node.id===id),economy=createEconomy();economy.claimed.push(`container:${id}`);
  const legacyLife={...createLife(),activeSeconds:60,containers:[id]};
  const save=restoreCampaignSave({version:2,unlocked:1,completed:[],stamps:[],levels:{},economy,life:legacyLife});
  assert.deepEqual(save.life.gathered[id],{readyAt:480,cycle:0});
  assert.ok(save.life.containers.includes(id));assert.ok(save.economy.claimed.includes(`container:${id}`));
  assert.equal(lifeAvailable(save.life,node),false);assert.equal(node.afterArt,undefined,"no new state patch replaces an old opened container");
  const before=JSON.stringify(save.economy);assert.equal(collectLife(save.life,save.economy,node).status,"empty");
  assert.equal(JSON.stringify(save.economy),before,"migration itself must never mint a second grant");
  save.life.activeSeconds=110;
  const reloaded=restoreLife(save.life,nodes);assert.deepEqual(reloaded.gathered[id],{readyAt:480,cycle:0},"reload must not restart the migration cooldown");
  reloaded.activeSeconds=480;assert.equal(collectLife(reloaded,save.economy,node).status,"new");
  assert.equal(collectLife(reloaded,save.economy,node).status,"empty");
  assert.ok(save.economy.claimed.includes(`container:${id}`));
  assert.equal(save.economy.claimed.filter(key=>key===`gather:${id}:0`).length,1);
  const again=restoreLife(reloaded,nodes);assert.deepEqual(again.gathered[id],reloaded.gathered[id]);
});
