// In-memory DAY05 getter override: no registry files or user browser storage touched.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {loadSource} from '../../../tests/load-source.mjs';
const {default:pack}=loadSource('src/campaign/exploration/day05.ts');
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
class Canvas extends EventTarget{width=960;height=540;style={};dataset={};getContext(){return {}}getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:960,height:540}}}
globalThis.window=new EventTarget();window.devicePixelRatio=1;globalThis.document=new EventTarget();document.hidden=false;document.getElementById=()=>new Canvas();globalThis.ResizeObserver=class{observe(){}disconnect(){}};globalThis.Image=class{decode(){return new Promise(()=>{})}};globalThis.requestAnimationFrame=()=>0;
const {CampaignGame}=loadSource('src/campaign/CampaignGame.ts');
const make=()=>{const game=new CampaignGame(new Canvas(),{onView(){},onToast(){},onPuzzle(){},onFinal(){},onDeath(){},onComplete(){},onAudio(){}});Object.defineProperty(game,'pack',{get:()=>pack});game.startLevel(4,true);game.level={...game.level,hazards:[]};return game;};
const walk=(g,id)=>{const e=g.entities.find(e=>e.id===id);assert.ok(e,id);g.navigate(e,e,false);for(let i=0;i<5000&&(g.path.length||g.focus||g.pending);i++)g.update(.04);assert.ok(!g.path.length&&!g.pending&&!g.focus,id+' did not finish');};
const g=make();const enter='d05-room-enter',leave='d05-room-return';
walk(g,enter);assert.equal(g.room,null,'failed image must leave player outside');
g.images.set(pack.room.id,{complete:true,naturalWidth:1672});
const mainBefore=[...g.solved];
for(const n of pack.outside){walk(g,n.id);assert.ok(g.discoveryFlags.has(n.id),n.id);}
walk(g,enter);assert.equal(g.room.id,pack.room.id);const returnPoint={...g.returnPoint};
walk(g,'d05-jam-card');assert.ok(!g.discoveryFlags.has('d05-jam-card'));
for(const n of pack.room.nodes){for(const id of n.sequence??[])walk(g,id);walk(g,n.id);assert.ok(g.discoveryFlags.has(n.id),n.id);}
assert.equal(g.discoveryFlags.size,13);assert.equal(g.explorationView().items.length,5);assert.equal(g.explorationView().achievements.filter(a=>a.done).length,2);assert.deepEqual([...g.solved],mainBefore);
for(const n of pack.room.nodes)walk(g,n.id);assert.equal(g.explorationView().items.length,5);
walk(g,leave);assert.equal(g.room,null);assert.deepEqual(g.player,returnPoint);walk(g,enter);assert.equal(g.discoveryFlags.size,13);walk(g,leave);g.saveNow();
const resumed=make();assert.equal(resumed.discoveryFlags.size,13);assert.equal(resumed.visitedRooms.size,1);assert.equal(resumed.explorationView().items.length,5);
// Production critter stepping, including intermediate points and multiple loops.
const pet=resumed.entities.find(e=>e.discovery?.animal);for(let i=0;i<2000;i++){resumed.updateCritters(.04);assert.ok(resumed.nav.isWalkable(resumed.entityPosition(pet)),'critter crossed wall');}
g.destroy();resumed.destroy();
const result={status:'PASS',checks:['image loading failure leaves player outside','3 outdoor actions via production navigate/update','real doorway entry','10 indoor actions via production navigate/update','reward prerequisite','13 stable flags and 5 unique album rewards','2 earned achievements','main-line solved flags unchanged','repeat interactions do not duplicate rewards','exact outdoor return point','re-entry preserves discovery','save/replay preserves discovery','80 seconds of production dog patrol stays walkable'],limitations:['Headless DOM/canvas stubs; no browser rendering, hover alpha or real asset decoding validated.','DAY05 pack getter overridden in test instance only; production registry unchanged.','Main outdoor hazards disabled for deterministic lifecycle coverage.']};writeFileSync('design/exploration-014/day05/runtime-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
