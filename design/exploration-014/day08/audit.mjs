import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadSource} from '../../../tests/load-source.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const source=p=>loadSource(resolve(root,p));
const pack=source('src/campaign/exploration/day08.ts').default;
const outdoor=source('src/campaign/worlds/day08.ts').default;
const {buildWorldNavigation}=source('src/campaign/worldGeometry.ts');
const {settleDiscovery,earnedAchievements}=source('src/campaign/exploration/discoveries.ts');
const {artBounds}=source('src/campaign/sceneRaster.ts');
const p=(x,y)=>({x:x*1600/1672,y:y*900/941});
const nav=buildWorldNavigation(pack.room.world,new Set());
const out=buildWorldNavigation(outdoor,new Set());
const all=[...pack.outside,...pack.room.nodes];
const points=[pack.room.world.spawn,pack.room.world.approaches.exit,...pack.room.nodes.map(n=>n.approach)];
let pairs=0,segments=0,resources=0;
for(const a of points) assert(nav.isWalkable(a),`Indoor stance ${JSON.stringify(a)}`);
for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) {
  const route=nav.route(points[i],points[j],undefined,0);
  assert(route.length,`Room disconnected ${i}/${j}`);
  let prev=points[i];
  for(const q of route){assert(nav.visible(prev,q),`Unsafe route segment ${i}/${j}`);prev=q;}
  pairs++;
}
for(const n of [pack.room.entry,...pack.outside]){
  assert(out.isWalkable(n.approach),`Outside stance ${n.title}`);
  assert(out.route(outdoor.spawn,n.approach,undefined,0).length,`Outside locked ${n.title}`);
  assert(out.route(n.approach,outdoor.spawn,undefined,0).length,`Outside return ${n.title}`);
}
const negatives=[[300,390],[630,270],[823,295],[1100,265],[1350,450],[1498,590],[176,631],[676,796],[951,787],[90,370],[1420,170],[1150,824]];
for(const [x,y] of negatives)assert(!nav.isWalkable(p(x,y)),`Blocked furniture/wall ${x},${y}`);
for(const n of all.filter(n=>n.animal)){
  assert(!n.baked && n.patrol?.length>=3,n.id);
  const active=pack.outside.includes(n)?out:nav;
  assert(active.isWalkable(n.position),n.id);
  for(let i=0;i<n.patrol.length;i++){
    const a=n.patrol[i],b=n.patrol[(i+1)%n.patrol.length];
    assert(active.isWalkable(a),n.id); assert(active.visible(a,b),`Patrol crosses wall ${n.id}`);segments++;
  }
}
const ids=new Set(all.map(n=>n.id));assert.equal(ids.size,all.length);
for(const n of [...all,...pack.achievements]){
  assert(n.id.startsWith('d08-'));
  for(const id of [...(n.requires??[]),...(n.sequence??[])])assert(ids.has(id),`Missing dependency ${id}`);
}
for(const n of all){
  assert(n.visual.support.length>12,n.id);assert(n.baked||n.art||n.animal,n.id);
  if(n.sequence)for(const id of n.sequence)assert(pack.room.nodes.some(q=>q.id===id&&q.kind==='inspect'));
}
const flags=new Set(),history=[];
assert.equal(earnedAchievements(pack,flags).length,0);
for(const n of all.filter(n=>n.requires?.length))assert.equal(settleDiscovery(n,all,flags,history).status,'locked',n.id);
for(let pass=0;pass<all.length;pass++)for(const n of all)if(!flags.has(n.id)&&(n.requires??[]).every(id=>flags.has(id))){
  for(const id of n.sequence??[])settleDiscovery(all.find(q=>q.id===id),all,flags,history);
  assert.equal(settleDiscovery(n,all,flags,history).status,'new',n.id);
}
assert.equal(flags.size,all.length,'Cyclic or unsatisfiable dependency');
const restored=new Set(JSON.parse(JSON.stringify([...flags])));
for(const n of all)assert.equal(settleDiscovery(n,all,restored,history).status,'repeat',`Duplicate ${n.id}`);
assert.equal(restored.size,all.length);
assert.equal(earnedAchievements(pack,restored).length,2);
for(const a of pack.achievements)for(const id of a.requires){const partial=new Set(flags);partial.delete(id);assert(!earnedAchievements(pack,partial).some(q=>q.id===a.id));}
function png(src){
  const path=resolve(root,'public'+src);assert(existsSync(path),src);const bytes=readFileSync(path);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');resources++;
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
assert.deepEqual(png(pack.room.background),{width:1672,height:941});
for(const n of all)for(const art of [n.art,n.afterArt].filter(Boolean)){
  const size=png(art.src),c=art.crop;
  if(c)assert(c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.x+c.width<=size.width&&c.y+c.height<=size.height,n.id);
  assert(art.width>0&&art.height>0,n.id);
  if(n.afterArt){const bounds=artBounds(art,n.position);assert(Math.abs(bounds.x-p(c.x,0).x)<.001);assert(Math.abs(bounds.y-p(0,c.y).y)<.001);}
}
assert.equal(pack.outside.length,3);assert.equal(pack.room.nodes.length,9);
console.log(JSON.stringify({day:8,indoorInteractions:pack.room.nodes.length,outdoorDiscoveries:pack.outside.length,rewards:all.filter(n=>n.reward).length,nonToolArchives:all.filter(n=>n.reward&&n.reward.category!=='tool').length,photos:all.filter(n=>n.kind==='photo').length,achievements:pack.achievements.length,connectedRoomPairs:pairs,blockedFurnitureAndWallProbes:negatives.length,safeClosedPatrolSegments:segments,pngResources:resources,dependencyAndIdempotence:'passed',entryAndReturnBeforeMainPuzzles:'passed',uiLifecycle:'NOT RUN: pending main-task registry integration'},null,2));
