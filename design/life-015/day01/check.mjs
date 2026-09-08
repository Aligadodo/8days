import assert from 'node:assert/strict';
import {loadSource} from '../../../tests/load-source.mjs';
const {buildWorldNavigation,allWorldFlags}=loadSource('src/campaign/worldGeometry.ts');
const {LEVELS}=loadSource('src/campaign/levels.ts');
const days=process.argv[2]?[Number(process.argv[2])]:[1,3];let failures=0;
for(const day of days){
 const suffix=String(day).padStart(2,'0');const {default:pack}=loadSource(`src/campaign/life/day${suffix}.ts`);
 const {default:world}=loadSource(`src/campaign/worlds/day${suffix}.ts`);const {default:exp}=loadSource(`src/campaign/exploration/day${suffix}.ts`);
 const ids=new Set();
 for(const [scene,nodes,w] of [['outside',pack.outside,world],['inside',pack.inside,exp.room.world]]){
  for(const node of nodes){assert(!ids.has(node.id));ids.add(node.id);assert(node.baked.length>=3);assert(node.id.startsWith(`d${suffix}-life-`));
   assert(node.visual.support!==node.description,'support must be physical');
   if(node.kind==='gather')assert(node.renewSeconds>=180);if(node.kind!=='inspect')assert(['salvage','nature','pantry','mineral','pocket','cloth','herbs','fruit','stone','wood','paper','tea'].includes(node.lootTable));
   if(node.sharedDiscovery){const old=[...exp.outside,...exp.room.nodes].find(n=>n.id===node.sharedDiscovery);assert(old);assert.deepEqual(node.approach,old.approach);assert.deepEqual(node.baked,old.baked)}
  }
  for(const mode of ['initial','complete']){const flags=mode==='initial'?new Set():allWorldFlags(w,LEVELS[day-1].puzzles.map(p=>p.id));const nav=buildWorldNavigation(w,flags);
   for(const node of nodes){const route=nav.route(w.spawn,node.approach,()=>false,0);let last=w.spawn;let okay=nav.isWalkable(node.approach)&&route.length>0&&Math.hypot(route.at(-1).x-node.approach.x,route.at(-1).y-node.approach.y)<.01;
    for(const point of route){okay=okay&&nav.visible(last,point);last=point}
    if(!okay){failures++;console.log(JSON.stringify({day,scene,mode,id:node.id,approach:node.approach,walkable:nav.isWalkable(node.approach),route:route.length}))}
   }
   const exit=scene==='inside'?w.approaches.exit:exp.room.entry.approach;assert(nav.route(w.spawn,exit,()=>false,0).length,'door unreachable');
  }
  console.log(`DAY${suffix} ${scene}: ${nodes.length} nodes (${nodes.filter(n=>n.kind==='container').length} container/${nodes.filter(n=>n.kind==='gather').length} gather/${nodes.filter(n=>n.kind==='inspect').length} inspect)`);
 }
}
console.log(`Navigation failures: ${failures}`);process.exitCode=failures?1:0;
