import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const pack=loadSource('src/campaign/life/day08.ts').default;
const exp=loadSource('src/campaign/exploration/day08.ts').default;
const outside=loadSource('src/campaign/worlds/day08.ts').default;
const {buildWorldNavigation,allWorldFlags}=loadSource('src/campaign/worldGeometry.ts');
const tables=new Set(['salvage','nature','pantry','mineral','pocket','cloth','herbs','fruit','stone','wood','paper','tea']);
const ids=new Set(),results=[];
const sharedIds=new Set();
const {artBounds}=loadSource('src/campaign/sceneRaster.ts');
let artChecks=0;
let segments=0;
for(const [scene,nodes,world] of [['outside',pack.outside,outside],['inside',pack.inside,exp.room.world]]){
  const initial=buildWorldNavigation(world,new Set());
  const full=buildWorldNavigation(world,allWorldFlags(world,['flower-bridge','crystal-safe','river-pulse','morning-count']));
  for(const kind of ['container','gather','inspect'])assert(nodes.filter(n=>n.kind===kind).length>=2,`${scene} ${kind}`);
  for(const node of nodes){
    assert(!ids.has(node.id)&&node.id.startsWith('d08-life-'),node.id);ids.add(node.id);
    assert(node.baked.length>=3&&node.visual.support.length>12,node.id);
    if(node.kind==='inspect')assert(!node.lootTable&&!node.renewSeconds,node.id);
    else assert(tables.has(node.lootTable),node.id);
    if(node.kind==='gather')assert(node.renewSeconds>=180,node.id);
    if(node.sharedDiscovery){const d=[...exp.outside,...exp.room.nodes].find(d=>d.id===node.sharedDiscovery);assert(d&&!d.animal,node.id);assert.notEqual(node.kind,'inspect');assert(!sharedIds.has(d.id));sharedIds.add(d.id);assert.deepEqual(node.approach,d.approach);assert.deepEqual(node.baked,d.baked);}
    if(node.afterArt){const a=node.afterArt,c=a.crop,bytes=readFileSync('public'+a.src);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert(c.x+c.width<=bytes.readUInt32BE(16)&&c.y+c.height<=bytes.readUInt32BE(20));const b=artBounds(a,node.position);assert(Math.abs(b.x-c.x*1600/1672)<1e-6);assert(Math.abs(b.y-c.y*900/941)<1e-6);artChecks++;}
    for(const [state,nav] of [['initial',initial],['full',full]]){
      assert(nav.isWalkable(node.approach),`${node.id} ${state} stance`);
      const route=nav.route(world.spawn,node.approach,undefined,0);
      assert(route.length,`${node.id} ${state} unreachable`);
      let prev=world.spawn;for(const q of route){assert(nav.visible(prev,q),`${node.id} ${state} crosses wall`);prev=q;segments++;}
      const back=nav.route(node.approach,world.spawn,undefined,0);assert(back.length,node.id);
      prev=node.approach;for(const q of back){assert(nav.visible(prev,q),`${node.id} return crosses wall`);prev=q;segments++;}
    }
    results.push({scene,id:node.id,kind:node.kind,initial:true,full:true,approach:node.approach,sharedDiscovery:node.sharedDiscovery??null});
  }
}
const mainNav=buildWorldNavigation(outside,new Set());
assert(mainNav.route(outside.spawn,exp.room.entry.approach,undefined,0).length);
const roomNav=buildWorldNavigation(exp.room.world,new Set());
assert(roomNav.route(exp.room.world.spawn,exp.room.world.approaches.exit,undefined,0).length);
const summary={day:8,outside:pack.outside.length,inside:pack.inside.length,counts:Object.fromEntries(['outside','inside'].map(s=>[s,Object.fromEntries(['container','gather','inspect'].map(k=>[k,pack[s].filter(n=>n.kind===k).length]))])),sharedNodes:results.filter(n=>n.sharedDiscovery).length,verifiedRouteSegments:segments,artChecks,initialAndFullReachability:true,doorwayRegression:true,nearestUsed:false,results};
writeFileSync('design/life-015/day08/audit-result.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify({...summary,results:undefined},null,2));
