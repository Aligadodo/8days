import assert from 'node:assert/strict';
import {loadSource} from '../../../tests/load-source.mjs';
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
class Canvas extends EventTarget {width=960;height=540;style={};dataset={};getContext(){return {}};getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:960,height:540}}}
globalThis.window=new EventTarget();window.devicePixelRatio=1;
globalThis.document=new EventTarget();document.hidden=false;document.getElementById=()=>new Canvas();
globalThis.ResizeObserver=class {observe(){} disconnect(){}};
globalThis.Image=class {decode(){return new Promise(()=>{})}};
globalThis.requestAnimationFrame=()=>0;
const {CampaignGame}=loadSource('src/campaign/CampaignGame.ts');
const {default:pack}=loadSource('src/campaign/exploration/day03.ts');
let doorChoices, puzzle;
const hooks={onView(){},onToast(){},onPuzzle:p=>{puzzle=p},onFinal(){},onDeath(){},onComplete(){},onAudio(){},onDoorChoice:(name,enter,main)=>{doorChoices={name,enter,main}}};
function make(){const g=new CampaignGame(new Canvas(),hooks);Object.defineProperty(g,'pack',{get:()=>pack});g.startLevel(2,true);g.level={...g.level,hazards:[]};g.images.set(pack.room.id,{complete:true,naturalWidth:1672});return g}
function walk(g,e){assert(e);g.navigate(e.approach,e,false);for(let i=0;i<5000&&(g.path.length||g.focus||g.pending);i++)g.update(.04);assert(!g.path.length&&!g.pending,`unfinished ${e.id}`)}
const g=make();
// Inject only the pack getter on this isolated instance; never mutate the registry.
walk(g,g.entities.find(e=>e.portal));assert(doorChoices);assert.equal(g.room,null);
doorChoices.main();assert(puzzle,'shared mill main choice absent');assert.equal(g.room,null);g.setPaused(false);
walk(g,g.entities.find(e=>e.portal));doorChoices.enter();assert.equal(g.room.id,pack.room.id);
const returnPoint={...g.returnPoint},solved=[...g.solved];
walk(g,g.entities.find(e=>e.id==='d03-seedlings'));assert(!g.discoveryFlags.has('d03-seedlings'));
for(let pass=0;pass<pack.room.nodes.length;pass++) for(const n of pack.room.nodes) {
 if(g.discoveryFlags.has(n.id)||(n.requires??[]).some(id=>!g.discoveryFlags.has(id)))continue;
 walk(g,g.entities.find(e=>e.id===n.id));assert(g.discoveryFlags.has(n.id),n.id);
}
for(let i=0;i<2000;i++){g.update(.04);for(const animal of g.critters.values())assert(g.nav.isWalkable(animal.point),'animal left safe floor')}
assert.deepEqual([...g.solved],solved,'side chain changed main progress');
walk(g,g.entities.find(e=>e.portal));assert(!g.room,JSON.stringify({phase:'return',player:g.player,exit:g.entities.find(e=>e.portal),walkable:g.nav.isWalkable(g.player)}));assert.deepEqual(g.player,returnPoint);
for(const n of pack.outside){walk(g,g.entities.find(e=>e.id===n.id));assert(g.discoveryFlags.has(n.id),n.id)}
assert.equal(g.explorationView().items.length,5);assert(g.explorationView().achievements.every(a=>a.done));
g.saveNow();const resumed=make();assert.equal(resumed.discoveryFlags.size,14);assert.equal(resumed.visitedRooms.size,1);
walk(resumed,resumed.entities.find(e=>e.portal));doorChoices.enter();
for(const n of pack.room.nodes)walk(resumed,resumed.entities.find(e=>e.id===n.id));
assert.equal(resumed.explorationView().items.length,5);assert.equal(resumed.discoveryFlags.size,14);
walk(resumed,resumed.entities.find(e=>e.portal));assert.equal(resumed.room,null);
for(const n of pack.room.nodes){
 resumed.switchRoom(pack.room);resumed.player={...n.approach};
 walk(resumed,resumed.entities.find(e=>e.portal));assert(!resumed.room,`return from ${n.id}`);
}
g.destroy();resumed.destroy();
console.log('PASS DAY03 headless runtime: shared door both choices, entry, locked action, 11 indoor + 3 outdoor actions, 80s pet patrol, exact return from every station, 5 reward replay dedup, 2 achievements, save/reload. No browser/real storage/registry changes. Rendering is not tested.');
