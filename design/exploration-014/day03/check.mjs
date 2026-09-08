import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSource } from "../../../tests/load-source.mjs";
const { default: pack } = loadSource("src/campaign/exploration/day03.ts");
const { default: outside } = loadSource("src/campaign/worlds/day03.ts");
const { buildWorldNavigation } = loadSource("src/campaign/worldGeometry.ts");
const insideNav = buildWorldNavigation(pack.room.world, new Set());
const outsideNav = buildWorldNavigation(outside, new Set());
let failures = 0;
const test = (name, nav, start, point) => {
  const route = nav.route(start, point, () => false, 0);
  const okay = nav.isWalkable(point) && route.length > 0 && Math.hypot(route.at(-1).x-point.x, route.at(-1).y-point.y)<1;
  console.log(JSON.stringify({ name, okay, point, ...(okay ? {} : { nearest: nav.nearest(point), route: route.length }) }));
  if (!okay) failures++;
};
test("room spawn", insideNav, pack.room.world.spawn, pack.room.world.spawn);
test("return threshold", insideNav, pack.room.world.spawn, pack.room.world.approaches.exit);
for (const node of pack.room.nodes) test(node.id, insideNav, pack.room.world.spawn, node.approach);
test("outdoor entrance", outsideNav, outside.spawn, pack.room.entry.approach);
for (const node of pack.outside) test(node.id, outsideNav, outside.spawn, node.approach);
for (const node of pack.room.nodes.filter(n => n.animal)) {
  for (const [i, p] of node.patrol.entries()) {
    test(`${node.id} patrol ${i}`, insideNav, pack.room.world.spawn, p);
    assert(insideNav.visible(p, node.patrol[(i+1) % node.patrol.length]), "Pet patrol segment crosses furniture");
  }
}
for (const [name, p] of Object.entries({ table: {x:520,y:460}, counter: {x:400,y:325}, bed: {x:1350,y:505}, flowerShelf: {x:992,y:364}, doorPillar: {x:380,y:683} })) {
  assert.equal(insideNav.isWalkable(p), false, `${name} negative collision sample`);
}
const ids = new Set([...pack.outside, ...pack.room.nodes].map(n => n.id));
for (const n of [...pack.outside, ...pack.room.nodes, ...pack.achievements])
  for (const id of n.requires ?? []) assert(ids.has(id), `${n.id} requires missing ${id}`);
assert(pack.outside.length >= 3 && pack.room.nodes.length >= 6);
assert([...pack.outside, ...pack.room.nodes].filter(n => n.reward).length >= 3);
assert.equal(pack.room.entry.sharedTarget, "mill");
assert.deepEqual(pack.room.entry.baked, outside.baked.mill);
const nodes = [...pack.outside, ...pack.room.nodes];
assert.equal(ids.size, nodes.length, "duplicate node ID");
assert.equal(new Set(pack.achievements.map(a=>a.id)).size, pack.achievements.length);
assert.equal(pack.room.background, "/assets/exploration-014/day03/seed-workshop-v2.png");
for (const n of [...nodes, ...pack.achievements]) assert(n.id.startsWith("d03-"));
const reached = new Set();
for(let pass=0;pass<nodes.length;pass++) for(const n of nodes)
  if((n.requires??[]).every(id=>reached.has(id))) reached.add(n.id);
assert.equal(reached.size,nodes.length,"dependency cycle");
for(const n of nodes) for(const id of n.sequence??[])
  assert(pack.room.nodes.some(x=>x.id===id && x.kind==="inspect"),"invalid sequence");
const png = src => {
  const b=readFileSync(`public${src}`);
  assert.equal(b.subarray(0,8).toString("hex"),"89504e470d0a1a0a",src);
  return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
};
const background=png(pack.room.background);
for(const n of nodes) for(const a of [n.art,n.afterArt].filter(Boolean)) {
  const size=png(a.src),c=a.crop;
  assert(a.width>0 && a.height>0);
  if(c) assert(c.x>=0 && c.y>=0 && c.width>0 && c.height>0 && c.x+c.width<=size.width && c.y+c.height<=size.height,"invalid crop");
}
const bed=nodes.find(n=>n.id==="d03-seedlings"), a=bed.afterArt,c=a.crop;
assert(c,"restored artwork must remain a local crop");
assert(c.width*c.height<background.width*background.height/10);
const {artBounds}=loadSource("src/campaign/SceneRaster.ts");
const bounds=artBounds(a,bed.position);
for(const [actual,expected] of [[bounds.x,c.x*1600/background.width],[bounds.y,c.y*900/background.height],[bounds.w,c.width*1600/background.width],[bounds.h,c.height*900/background.height]])
  assert(Math.abs(actual-expected)<.02,"restored crop registration drift");
for(const [name,p] of Object.entries({rearCabinet:{x:737,y:308},archPillar:{x:847,y:360},catDish:{x:819,y:458},bench:{x:1175,y:302},outerWall:{x:970,y:837}}))
  assert.equal(insideNav.isWalkable(p),false,name);
const {settleDiscovery,earnedAchievements}=loadSource("src/campaign/exploration/discoveries.ts");
const flags=new Set(),history=[];
for(const n of nodes.filter(n=>n.requires?.length)) {
  assert.equal(settleDiscovery(n,nodes,flags,history).status,"locked",n.id);
  assert.equal(flags.size,0,"locked action changes state");
}
assert.equal(earnedAchievements(pack,flags).length,0);
for(let pass=0;pass<nodes.length;pass++) for(const n of nodes) {
  if(flags.has(n.id)||(n.requires??[]).some(id=>!flags.has(id))) continue;
  assert.equal(settleDiscovery(n,nodes,flags,history).status,"new",n.id);
}
assert.equal(flags.size,nodes.length);
assert.equal(earnedAchievements(pack,flags).length,2);
const rewardIds=()=>nodes.filter(n=>n.reward && flags.has(n.id)).map(n=>n.id);
const firstRewards=rewardIds();
for(const n of nodes) assert.equal(settleDiscovery(n,nodes,flags,history).status,"repeat",n.id);
assert.deepEqual(rewardIds(),firstRewards,"repeated actions duplicate rewards");
for(const achievement of pack.achievements) for(const id of achievement.requires) {
  const incomplete=new Set(flags); incomplete.delete(id);
  assert(!earnedAchievements(pack,incomplete).some(a=>a.id===achievement.id),`${achievement.id} ignores ${id}`);
}
console.log(JSON.stringify({summary:"DAY03 audit",outside:pack.outside.length,inside:pack.room.nodes.length,rewards:firstRewards.length,photos:nodes.filter(n=>n.kind==="photo").length,animals:nodes.filter(n=>n.animal).length,achievements:pack.achievements.length,negativeSamples:10,failures}));
process.exitCode = failures ? 1 : 0;
