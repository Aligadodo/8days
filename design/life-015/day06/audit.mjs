import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const {default:pack}=loadSource('src/campaign/life/day06.ts');
const {default:outside}=loadSource('src/campaign/worlds/day06.ts');
const {default:exp}=loadSource('src/campaign/exploration/day06.ts');
const {buildWorldNavigation,allWorldFlags}=loadSource('src/campaign/worldGeometry.ts');
const {LEVELS}=loadSource('src/campaign/levels.ts');
const all=[...pack.outside,...pack.inside],ids=new Set(all.map(n=>n.id)),checks=[];
assert.equal(ids.size,all.length);
const sharedIds=all.filter(n=>n.sharedDiscovery).map(n=>n.sharedDiscovery);assert.equal(new Set(sharedIds).size,sharedIds.length);assert.ok(all.every(n=>!(n.sharedDiscovery&&n.kind==='inspect')));
for(const [name,nodes,w,discoveries] of [['outside',pack.outside,outside,exp.outside],['inside',pack.inside,exp.room.world,exp.room.nodes]]){
 assert.ok(nodes.length>=6);
 for(const flags of [new Set(),allWorldFlags(w,LEVELS[5].puzzles.map(p=>p.id))]){
 const nav=buildWorldNavigation(w,flags);
 for(const n of nodes){
 assert.ok(n.id.startsWith('d06-life-'));assert.ok(nav.isWalkable(n.approach),n.id+' stance');
 for(const [start,end] of [[w.spawn,n.approach],[n.approach,w.spawn]]){const route=nav.route(start,end,()=>false,0);assert.ok(route.length,n.id+' route');let prev=start;for(const next of route){assert.ok(nav.visible(prev,next),n.id+' segment');prev=next;}}
 assert.ok(n.baked.length>=3);for(const p of n.baked)assert.ok(p.x>=0&&p.x<=1600&&p.y>=0&&p.y<=900,n.id);
 assert.ok(Number.isFinite(n.visual.depth));
 if(n.kind==='gather')assert.ok(n.renewSeconds>=180);
 if(n.kind==='inspect')assert.equal(n.lootTable,undefined);else assert.ok(['nature','mineral','pantry','salvage','pocket','cloth','herbs','fruit','stone','wood','paper','tea'].includes(n.lootTable));
 if(n.sharedDiscovery){const d=discoveries.find(d=>d.id===n.sharedDiscovery);assert.ok(d);assert.deepEqual(n.approach,d.approach);assert.deepEqual(n.baked,d.baked);}
 checks.push(`${name}/${flags.size?'full':'initial'}/${n.id}`);
 }
 const point=name==='outside'?exp.room.entry.approach:w.approaches.exit;
 assert.ok(nav.route(w.spawn,point,()=>false,0).length,'portal');
 }
}
const counts=Object.fromEntries(['outside','inside'].map(k=>[k,{total:pack[k].length,...Object.fromEntries(['container','gather','inspect'].map(kind=>[kind,pack[k].filter(n=>n.kind===kind).length]))}]));
writeFileSync('design/life-015/day06/audit-results.json',JSON.stringify({counts,checks,limitations:['Outside 1 container, inside 1; no persistent open-state raster yet.','No live runtime economy/save test; no afterArt.']},null,2));
console.log('PASS',checks.length,'node/state checks: stance, bidirectional routes, every visible segment, polygons, loot lifecycle, exact sharedDiscovery geometry, both portals');console.log(counts);


