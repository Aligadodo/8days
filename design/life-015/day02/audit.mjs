// From repository root: node design/life-015/day02/audit.mjs [2|4]
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSource } from '../../../tests/load-source.mjs';
const day=Number(process.argv[2]??2), nn=String(day).padStart(2,'0');
const pack=loadSource(`src/campaign/life/day${nn}.ts`).default;
const exploration=loadSource(`src/campaign/exploration/day${nn}.ts`).default;
const outside=loadSource(`src/campaign/worlds/day${nn}.ts`).default;
const {buildWorldNavigation,allWorldFlags}=loadSource('src/campaign/worldGeometry.ts');
const {LEVELS}=loadSource('src/campaign/levels.ts');
const {contains}=loadSource('src/campaign/navigation.ts');
const {artBounds}=loadSource('src/campaign/SceneRaster.ts');
let failures=0;
const results=[];
const all=[...pack.outside,...pack.inside];
assert.equal(new Set(all.map(n=>n.id)).size,all.length);
const validate=(navigation,start,end)=>{
  if(!navigation.isWalkable(end)) return false;
  const route=navigation.route(start,end,()=>false,0);
  if(!route.length || JSON.stringify(route.at(-1))!==JSON.stringify(end)) return false;
  let previous=start;
  for(const p of route){assert.ok(navigation.visible(previous,p),'segment clips obstacle');previous=p;}
  return true;
};
for(const scene of ['outside','inside']) {
  const world=scene==='outside'?outside:exploration.room.world;
  const initial=buildWorldNavigation(world,new Set());
  const full=buildWorldNavigation(world,allWorldFlags(world,LEVELS[day-1].puzzles.map(p=>p.id)));
  for(const n of pack[scene]) {
    assert.ok(n.id.startsWith(`d${nn}-life-`)); assert.ok(n.baked.length>=3);
    assert.ok(n.visual.support && Number.isFinite(n.visual.depth??0));
    assert.ok(n.baked.every(p=>p.x>=0&&p.x<=1600&&p.y>=0&&p.y<=900));
    if(n.kind==='gather') assert.ok(n.renewSeconds>=180);
    if(n.kind!=='inspect') assert.ok(['salvage','nature','pantry','mineral','pocket','cloth','herbs','fruit','stone','wood','paper','tea'].includes(n.lootTable));
    else assert.ok(!n.lootTable,'private observation grants loot');
    if(n.sharedDiscovery) {
      const original=[...exploration.outside,...exploration.room.nodes].find(x=>x.id===n.sharedDiscovery);
      assert.ok(original); assert.deepEqual(n.approach,original.approach);assert.deepEqual(n.baked,original.baked);
      assert.notEqual(n.kind,'inspect','duplicated old inspect');
    }
    if(n.afterArt) {
      const art=n.afterArt,c=art.crop, bytes=readFileSync(`public${art.src}`);
      assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
      assert.ok(c.x>=0&&c.y>=0&&c.x+c.width<=width&&c.y+c.height<=height);
      const bounds=artBounds(art,n.position);
      for(const [key,value] of Object.entries({x:c.x*1600/width,y:c.y*900/height,w:c.width*1600/width,h:c.height*900/height}))
        assert.ok(Math.abs(bounds[key]-value)<1e-8,'afterArt registration');
    }
    const init=validate(initial,world.spawn,n.approach), complete=validate(full,world.spawn,n.approach);
    if(!complete) failures++;
    if(scene==='inside' && complete) assert.ok(validate(full,n.approach,world.approaches.exit),'cannot return');
    const conflicts=[...(scene==='outside'?exploration.outside:exploration.room.nodes),
      ...(scene==='outside'?Object.entries(world.baked).map(([id,baked])=>({id,baked})):[])]
      .filter(x=>x.id!==n.sharedDiscovery&&x.baked)
      .filter(x=>n.baked.some(p=>contains(p,x.baked))||x.baked.some(p=>contains(p,n.baked)))
      .map(x=>x.id);
    results.push({scene,id:n.id,kind:n.kind,approach:n.approach,initial:init,full:complete,conflicts});
    if(conflicts.length) failures++;
  }
}
console.log(JSON.stringify({day,nodes:all.length,failures,results},null,2));
process.exitCode=failures?1:0;
