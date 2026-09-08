import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const pack=loadSource('src/campaign/life/day07.ts').default, exp=loadSource('src/campaign/exploration/day07.ts').default;
const world=loadSource('src/campaign/worlds/day07.ts').default;
const {buildWorldNavigation,allWorldFlags}=loadSource('src/campaign/worldGeometry.ts');
const {LEVELS}=loadSource('src/campaign/levels.ts');
const ids=new Set(),results=[];
for(const [scene,nodes,w] of [['outside',pack.outside,world],['inside',pack.inside,exp.room.world]]) {
 assert.ok(nodes.length>=6);for(const k of ['container','gather','inspect'])assert.ok(nodes.filter(n=>n.kind===k).length>=2);
 for(const flags of [new Set(),allWorldFlags(w,LEVELS[6].puzzles.map(p=>p.id))]) {
 const nav=buildWorldNavigation(w,flags);
 for(const n of nodes) {assert.ok(nav.isWalkable(n.approach),n.id+' stance');const route=nav.route(w.spawn,n.approach,()=>false,0);assert.ok(route.length,n.id+' reachable');let prev=w.spawn;for(const q of route){assert.ok(nav.visible(prev,q),n.id+' segment');prev=q;}}
 const door=scene==='outside'?exp.room.entry.approach:exp.room.world.approaches.exit;assert.ok(nav.route(w.spawn,door,()=>false,0).length);
 }
 for(const n of nodes){assert.ok(!ids.has(n.id));ids.add(n.id);assert.ok(n.id.startsWith('d07-life-'));assert.ok(n.baked.length>=3);assert.ok(n.visual.support.length>6);if(n.kind==='gather')assert.ok(n.renewSeconds>=180);if(n.kind==='inspect')assert.equal(n.lootTable,undefined);else assert.ok(['salvage','nature','pantry','mineral','pocket','cloth','herbs','fruit','stone','wood','paper','tea'].includes(n.lootTable));if(n.sharedDiscovery){const d=[...exp.outside,...exp.room.nodes].find(d=>d.id===n.sharedDiscovery);assert.ok(d);assert.deepEqual(n.approach,d.approach);assert.deepEqual(n.baked,d.baked);}}
 results.push({scene,total:nodes.length,container:nodes.filter(n=>n.kind==='container').length,gather:nodes.filter(n=>n.kind==='gather').length,inspect:nodes.filter(n=>n.kind==='inspect').length});
}
const drawer=pack.inside.find(n=>n.id==='d07-life-register-drawer');const art=drawer.afterArt;assert.ok(art);const image=readFileSync('public'+art.src);assert.equal(image.readUInt32BE(16),1672);assert.equal(image.readUInt32BE(20),941);assert.ok(art.crop.x+art.crop.width<=1672&&art.crop.y+art.crop.height<=941);const {artBounds}=loadSource('src/campaign/SceneRaster.ts');const bounds=artBounds(art,drawer.position);assert.ok(Math.abs(bounds.x-1338*1600/1672)<1e-8);assert.ok(Math.abs(bounds.y-562*900/941)<1e-8);assert.ok(drawer.approach.y-bounds.y-bounds.h>25);for(const q of drawer.baked)assert.ok(q.x>=bounds.x&&q.x<=bounds.x+bounds.w&&q.y>=bounds.y&&q.y<=bounds.y+bounds.h);
const report={passed:true,results,checks:['initial and full flag route for every authored stance','every segment visible','room entrance and return remain reachable','sharedDiscovery exact stance and polygon','drawer PNG crop and exact artBounds registration; baked inside patch; stance clearance >25','unique IDs loot enums renewal minimum'],pending:['remaining three container open-state raster assets','browser runtime economy persistence and shared interactions']};writeFileSync('design/life-015/day07/audit-result.json',JSON.stringify(report,null,2));console.log(report);
