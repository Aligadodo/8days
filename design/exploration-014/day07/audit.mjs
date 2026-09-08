import assert from 'node:assert/strict';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const pack=loadSource('src/campaign/exploration/day07.ts').default;
const {buildWorldNavigation}=loadSource('src/campaign/worldGeometry.ts');
const outside=loadSource('src/campaign/worlds/day07.ts').default;
const {settleDiscovery,earnedAchievements,allDiscoveries}=loadSource('src/campaign/exploration/discoveries.ts');
const nav=buildWorldNavigation(pack.room.world,new Set()), main=buildWorldNavigation(outside,new Set());
const nodes=allDiscoveries(pack), ids=new Set(nodes.map(n=>n.id));
assert.equal(ids.size,nodes.length); assert.equal(pack.outside.length,3); assert.equal(pack.room.nodes.length,9);
function route(n,a,b){assert.ok(n.isWalkable(a),`start ${JSON.stringify(a)}`);assert.ok(n.isWalkable(b),`stance ${JSON.stringify(b)}`);const r=n.route(a,b,()=>false,0);assert.ok(r.length,'route');let prev=a;for(const step of r){assert.ok(n.visible(prev,step),'segment');prev=step;}}
route(main,outside.spawn,pack.room.entry.approach);
for(const n of pack.outside) {try{route(main,outside.spawn,n.approach);}catch(e){throw new Error(n.id+': '+e.message);}}
for(const n of [...pack.room.nodes,{id:'return',approach:pack.room.world.approaches.exit}]){try{route(nav,pack.room.world.spawn,n.approach);}catch(e){throw new Error(n.id+': '+e.message);}}
for(const obstacle of pack.room.world.obstacles){const a=obstacle.polygon;const c={x:a.reduce((s,p)=>s+p.x,0)/a.length,y:a.reduce((s,p)=>s+p.y,0)/a.length};assert.ok(!nav.isWalkable(c),obstacle.name);}
for(const animal of nodes.filter(n=>n.animal)){const points=[animal.position,...animal.patrol,animal.position];for(let i=1;i<points.length;i++)route(nav,points[i-1],points[i]);}
for(const n of nodes){assert.ok(n.visual.support.length>6);assert.ok(n.baked||n.animal||n.art);for(const id of [...n.requires??[],...n.sequence??[]])assert.ok(ids.has(id));for(const id of n.sequence??[])assert.equal(pack.room.nodes.find(x=>x.id===id)?.kind,'inspect');}
const flags=new Set(),history=[];const register=nodes.find(n=>n.id==='d07-register');assert.equal(settleDiscovery(register,nodes,flags,history).status,'locked');
settleDiscovery(nodes.find(n=>n.id==='d07-sort-board'),nodes,flags,history);assert.equal(settleDiscovery(register,nodes,flags,history).status,'sequence');
for(let pass=0;pass<nodes.length;pass++)for(const n of nodes){if(flags.has(n.id)||(n.requires??[]).some(id=>!flags.has(id)))continue;for(const id of n.sequence??[])settleDiscovery(nodes.find(x=>x.id===id),nodes,flags,history);assert.equal(settleDiscovery(n,nodes,flags,history).status,'new');}
assert.equal(flags.size,nodes.length);const count=flags.size;for(const n of nodes)assert.equal(settleDiscovery(n,nodes,flags,history).status,'repeat');assert.equal(flags.size,count);assert.equal(earnedAchievements(pack,flags).length,2);
for(const a of pack.achievements)for(const id of a.requires)assert.ok(ids.has(id));
const file='public'+pack.room.background;assert.ok(existsSync(file));const png=readFileSync(file);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),1672);assert.equal(png.readUInt32BE(20),941);
for(const n of nodes)for(const a of [n.art,n.afterArt].filter(Boolean)){const b=readFileSync('public'+a.src);if(a.crop){assert.ok(a.crop.x>=0&&a.crop.y>=0);assert.ok(a.crop.x+a.crop.width<=b.readUInt32BE(16));assert.ok(a.crop.y+a.crop.height<=b.readUInt32BE(20));}}
// Real shared lifecycle in isolated Node mocks. Override ONLY this instance's pack getter; registry and user storage remain untouched.
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
class Canvas extends EventTarget{width=960;height=540;style={};dataset={};getContext(){return{};}getBoundingClientRect(){return{x:0,y:0,left:0,top:0,width:960,height:540};}}
globalThis.window=new EventTarget();window.devicePixelRatio=1;globalThis.document=new EventTarget();document.hidden=false;document.getElementById=()=>new Canvas();globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.Image=class{decode(){return new Promise(()=>{});}};globalThis.requestAnimationFrame=()=>0;
const {CampaignGame}=loadSource('src/campaign/CampaignGame.ts');const hooks={onView(){},onToast(){},onPuzzle(){},onFinal(){},onDeath(){},onComplete(){},onAudio(){}};
function make(){const g=new CampaignGame(new Canvas(),hooks);Object.defineProperty(g,'pack',{get:()=>pack});g.startLevel(6,true);g.level={...g.level,hazards:[]};g.images.set(pack.room.id,{complete:true,naturalWidth:1672});return g;}
function walk(g,e){assert.ok(e);g.navigate(e.approach,e,false);for(let i=0;i<5000&&(g.path.length||g.focus||g.pending);i++)g.update(.04);assert.ok(!g.path.length&&!g.pending,e.id);}
const g=make();for(const n of pack.outside)walk(g,g.entities.find(e=>e.id===n.id));walk(g,g.entities.find(e=>e.portal));assert.equal(g.room.id,'d07-room');const back={...g.returnPoint},solved=[...g.solved];
for(const n of pack.room.nodes){for(const id of n.sequence??[])walk(g,g.entities.find(e=>e.id===id));walk(g,g.entities.find(e=>e.id===n.id));assert.ok(g.discoveryFlags.has(n.id),n.id);}
assert.deepEqual([...g.solved],solved);assert.equal(g.discoveryFlags.size,12);walk(g,g.entities.find(e=>e.portal));assert.equal(g.room,null);assert.deepEqual(g.player,back);g.saveNow();const resumed=make();assert.equal(resumed.discoveryFlags.size,12);assert.equal(resumed.visitedRooms.size,1);g.destroy();resumed.destroy();
const result={passed:true,counts:{outside:3,indoor:9,rewards:nodes.filter(n=>n.reward).length,photos:nodes.filter(n=>n.kind==='photo').length,achievements:2,animals:1,obstacles:pack.room.world.obstacles.length},checks:['outdoor entry and discoveries reachable','indoor approaches and return reachable','every route segment visible','all furniture/wall centers blocked','closed patrol cycle navigable','dependencies and sequence valid','wrong order rejected','rewards idempotent','achievement conditions achievable','PNG dimensions and resource paths','shared runtime enter interact return replay with isolated memory storage'],notVerified:['browser visual composition','real browser save migration/death/pause/load failure','main registry integration']};writeFileSync('design/exploration-014/day07/audit-result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
