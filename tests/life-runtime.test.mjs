import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./load-source.mjs";
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
class Canvas extends EventTarget {
  width=960;height=540;style={};dataset={};getContext(){return {};}
  getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:960,height:540};}
}
globalThis.window=new EventTarget();window.devicePixelRatio=1;
globalThis.document=new EventTarget();document.hidden=false;document.getElementById=()=>new Canvas();
globalThis.ResizeObserver=class {observe(){}disconnect(){}};
globalThis.Image=class {decode(){return new Promise(()=>{});}};
globalThis.requestAnimationFrame=()=>0;
const {CampaignGame}=loadSource("src/campaign/CampaignGame.ts");
const {LIFE_PACKS}=loadSource("src/campaign/life/packs.ts");
const {EXPLORATION_PACKS}=loadSource("src/campaign/exploration/packs.ts");
const {createLife,restoreLife,collectLife,lifeAvailable}=loadSource("src/campaign/life/runtime.ts");
const {createEconomy}=loadSource("src/campaign/life/economy.ts");
const {PetFollowers}=loadSource("src/campaign/life/pets.ts");
const {Navigation,rectangle,contains}=loadSource("src/campaign/navigation.ts");
const {WORLDS}=loadSource("src/campaign/worldDesign.ts");
const {lifeEntity}=loadSource("src/campaign/entities.ts");
const hooks={onView(){},onToast(){},onPuzzle(){},onFinal(){},onDeath(){},onComplete(){},onAudio(){}};
const gameFor=(day=1,overrides={})=>{const game=new CampaignGame(new Canvas(),{...hooks,...overrides});game.startLevel(day-1,true);game.level={...game.level,hazards:[]};return game;};
const finish=game=>{for(let i=0;i<7000&&(game.path.length||game.focus||game.pending);i++)game.update(.04);
  assert.ok(!game.path.length&&!game.pending,"navigation/action did not finish");};
const walk=(game,entity)=>{assert.ok(entity);game.navigate(entity.approach,entity,false);finish(game);};
const readyRoom=(game,day)=>{const room=EXPLORATION_PACKS[day-1].room;game.images.set(room.id,{complete:true,naturalWidth:1600});return room;};
for(const pack of LIFE_PACKS)for(const inside of [false,true])test(`DAY ${pack.day} ${inside?"inside":"outside"}: every life node has a real mouse-hit pixel within its authored outline`,t=>{
  storage.clear();const game=gameFor(pack.day);t.after(()=>game.destroy());
  if(inside)game.switchRoom(readyRoom(game,pack.day));
  const unreachable=[];
  for(const node of inside?pack.inside:pack.outside){
    const xs=node.baked.map(p=>p.x),ys=node.baked.map(p=>p.y);
    let sample=null,insidePoints=0;const intercepted=new Set();
    for(let y=Math.ceil(Math.min(...ys));y<=Math.max(...ys)&&!sample;y+=2)
      for(let x=Math.ceil(Math.min(...xs));x<=Math.max(...xs);x+=2){
        const point={x,y};if(!contains(point,node.baked))continue;insidePoints++;
        const hit=game.hit(point);if(hit?.life?.id===node.id){sample=point;break;}
        intercepted.add(hit?.id??"none");
      }
    if(!sample)unreachable.push({id:node.id,insidePoints,intercepted:[...intercepted]});
  }
  assert.deepEqual(unreachable,[],"all authored life outlines need at least one actual input hit; direct navigate is not enough");
});
for(const pack of LIFE_PACKS)test(`DAY ${pack.day}: every life node grants once or inspects without stealing main tasks; state survives return and reload`,t=>{
  storage.clear();const messages=[];const game=gameFor(pack.day,{onToast:message=>messages.push(message)});t.after(()=>game.destroy());
  game.level.puzzles.forEach(p=>game.solved.add(p.id));WORLDS[pack.day-1].mechanisms.forEach(m=>game.worldFlags.add(m.id));game.rebuildNavigation();
  const mainBefore=[...game.solved],room=readyRoom(game,pack.day);
  for(const [inside,nodes] of [[false,pack.outside],[true,pack.inside]]){
    if(inside)walk(game,game.entities.find(e=>e.portal));
    assert.equal(Boolean(game.room),inside);
    for(const node of nodes){
      const entity=game.entities.find(e=>e.life?.id===node.id);assert.ok(entity,`${node.id} not registered as a real entity`);
      walk(game,entity);
      if(node.kind==="container")assert.ok(game.life.containers.includes(node.id),`${node.id} no grant after walking`);
      if(node.kind==="gather")assert.ok(game.life.gathered[node.id],`${node.id} no harvest after walking: player=${JSON.stringify(game.player)} target=${JSON.stringify(node.approach)} recent=${JSON.stringify(messages.slice(-2))}`);
      if(node.kind==="inspect")assert.ok(messages.includes(node.description),`${node.id} did not execute its inspection`);
      const state=JSON.stringify(game.economy);walk(game,game.entities.find(e=>e.life?.id===node.id));
      assert.equal(JSON.stringify(game.economy),state,`${node.id}: repeat duplicated loot or inspect granted material`);
    }
  }
  assert.deepEqual([...game.solved],mainBefore,"mainline puzzle state changed through a life node");
  const snapshot=structuredClone(game.economy);walk(game,game.entities.find(e=>e.portal));assert.equal(game.room,null);
  game.saveNow();const reloaded=new CampaignGame(new Canvas(),hooks);reloaded.startLevel(pack.day-1);
  t.after(()=>reloaded.destroy());assert.deepEqual(reloaded.economy,snapshot,"backpack or coins failed reload");
  assert.deepEqual(reloaded.life.containers,game.life.containers);assert.deepEqual(reloaded.life.gathered,game.life.gathered);
  reloaded.startLevel(pack.day-1,true);assert.deepEqual(reloaded.economy,snapshot,"replay reset lifetime inventory");
  assert.equal(room.id,EXPLORATION_PACKS[pack.day-1].room.id);game.destroy();reloaded.destroy();
});
test("a container has cancellable anticipation, matching sound, and a travelling pickup burst only after its atomic reward",()=>{
  storage.clear();const sounds=[];const game=gameFor(1,{onAudio:c=>sounds.push(c.id)});
  const entity=game.entities.find(e=>e.life?.kind==="container");game.player={...entity.approach};
  const before=JSON.stringify(game.economy);game.arrive(entity);assert.ok(game.actionDuration>=.7);game.update(.2);
  assert.equal(JSON.stringify(game.economy),before);assert.ok(sounds.includes("life.rummage"));
  game.setPaused(true);game.update(20);assert.equal(JSON.stringify(game.economy),before);
  game.setPaused(false);game.arrive(entity);finish(game);
  assert.ok(game.life.containers.includes(entity.life.id));assert.ok(sounds.includes("life.collect"));assert.ok(game.pickups.length);
  const granted=JSON.stringify(game.economy);game.interact(entity);assert.equal(JSON.stringify(game.economy),granted);game.destroy();
});
test("gather renewal and item effects use active online time only, never paused, hidden, dead, offline, or day-reset time",()=>{
  storage.clear();const game=gameFor(1),node=LIFE_PACKS[0].outside.find(n=>n.kind==="gather"),entity=game.entities.find(e=>e.life?.id===node.id);
  walk(game,entity);const active=game.life.activeSeconds,ready=game.life.gathered[node.id].readyAt;
  assert.ok(ready-active>=179.9);game.setPaused(true);game.update(3600);assert.equal(game.life.activeSeconds,active);
  game.setPaused(false);document.hidden=true;game.update(3600);document.hidden=false;assert.equal(game.life.activeSeconds,active);
  game.dead=true;game.update(3600);game.dead=false;assert.equal(game.life.activeSeconds,active);
  game.saveNow();const reloaded=gameFor(1);assert.equal(reloaded.life.activeSeconds,active);assert.equal(lifeAvailable(reloaded.life,node),false);
  reloaded.startLevel(2,true);assert.equal(reloaded.life.activeSeconds,active);assert.equal(lifeAvailable(reloaded.life,node),false);
  reloaded.life.activeSeconds=ready-.05;assert.equal(lifeAvailable(reloaded.life,node),false);reloaded.update(.04);assert.equal(lifeAvailable(reloaded.life,node),false);
  reloaded.update(.04);assert.equal(lifeAvailable(reloaded.life,node),true);
  assert.equal(collectLife(reloaded.life,reloaded.economy,node).status,"new");assert.equal(reloaded.life.gathered[node.id].cycle,2);
  game.destroy();reloaded.destroy();
});
test("failed loot grants do not consume a container or reset a gather timer; malformed lifecycle saves stay bounded",()=>{
  const state=createLife(),economy=createEconomy(),node={id:"d01-life-unit",kind:"gather",lootTable:"salvage",renewSeconds:1,description:"观察",emptyText:"取过"};
  economy.coins=999999;assert.equal(collectLife(state,economy,node).status,"blocked");assert.deepEqual(state.gathered,{});
  economy.coins=0;assert.equal(collectLife(state,economy,node).status,"new");assert.equal(state.gathered[node.id].readyAt,180);
  const restored=restoreLife({activeSeconds:NaN,containers:"bad",gathered:{[node.id]:{readyAt:Infinity,cycle:-8},other:{cycle:5}},
    effects:{paceUntil:Infinity,paceMultiplier:999,petCallUntil:-9}},[node]);
  assert.equal(restored.activeSeconds,0);assert.deepEqual(restored.containers,[]);assert.equal(restored.gathered[node.id].cycle,0);
  assert.equal(restored.effects.paceMultiplier,1.12);assert.equal(restored.effects.petCallUntil,0);assert.equal(restored.gathered.other,undefined);
});
test("public backpack transactions stack, sell, consume, adopt many pets, deploy only three, and survive every scene/save boundary",()=>{
  storage.clear();const game=gameFor(1);game.economy.coins=1000;game.setPaused(true);
  assert.equal(game.buyItem("trail-snack",2).ok,true);assert.equal(game.economy.inventory["trail-snack"],4);
  assert.equal(game.sellItem("trail-snack",1).ok,true);assert.equal(game.economy.inventory["trail-snack"],3);
  assert.equal(game.useItem("trail-snack").ok,true);assert.equal(game.economy.inventory["trail-snack"],2);
  assert.equal(game.getView().life.paceSeconds,30);assert.equal(game.life.effects.paceMultiplier,1.12);
  for(const species of ["cat","dog","mouse","cat"])assert.equal(game.buyPet(species).ok,true);
  for(const pet of game.economy.pets.slice(0,3))assert.equal(game.equipPet(pet.id,true).ok,true);
  assert.equal(game.equipPet(game.economy.pets[3].id,true).ok,false);assert.equal(game.followers.pets.size,3);
  assert.equal(game.buyItem("pet-treat").ok,true);assert.equal(game.useItem("pet-treat").ok,true);assert.equal(game.getView().life.petCallSeconds,45);
  const before=JSON.stringify(game.economy);assert.equal(game.sellItem("trail-snack",NaN).ok,false);assert.equal(JSON.stringify(game.economy),before);
  game.update(1000);assert.equal(game.getView().life.paceSeconds,30,"paused inventory effects expired");
  game.setPaused(false);const room=readyRoom(game,1);game.switchRoom(room);assert.equal(game.followers.pets.size,3);
  for(const pet of game.followers.pets.values())assert.ok(game.nav.isWalkable(pet.point));
  game.switchRoom(null);game.saveNow();const reloaded=gameFor(1);
  assert.deepEqual(reloaded.economy.pets,game.economy.pets);assert.deepEqual(reloaded.economy.equipped,game.economy.equipped);assert.equal(reloaded.followers.pets.size,3);
  assert.equal(reloaded.getView().life.paceSeconds,30);reloaded.update(31);assert.equal(reloaded.getView().life.paceSeconds,0);
  game.destroy();reloaded.destroy();
});
test("pet followers walk continuously around furniture, keep a stable turn, never block the player, and wait at disconnected ground",()=>{
  const nav=new Navigation([{name:"floor",polygon:rectangle(0,0,1000,800)}],[rectangle(380,150,160,290)]);
  const pets=new PetFollowers(),equipped=[{id:"pet-1",species:"cat",name:"猫"},{id:"pet-2",species:"dog",name:"狗"},{id:"pet-3",species:"mouse",name:"鼠"}];
  let player={x:180,y:290};pets.reset(equipped,player,nav);
  const path=nav.route(player,{x:760,y:290},()=>false,0);assert.ok(path.length>1);
  let travelled=0;const turns=new Map(equipped.map(p=>[p.id,[]]));
  for(let tick=0;tick<1100;tick++){
    if(path.length){const to=path[0],d=Math.hypot(to.x-player.x,to.y-player.y),step=Math.min(5,d);
      if(d<.01)path.shift();else{player={x:player.x+(to.x-player.x)*step/d,y:player.y+(to.y-player.y)*step/d};if(step===d)path.shift();}}
    const before=new Map([...pets.pets].map(([id,pet])=>[id,{point:{...pet.point},direction:pet.direction}]));pets.update(.04,player,nav);
    for(const pet of pets.pets.values()){const prev=before.get(pet.id),d=Math.hypot(prev.point.x-pet.point.x,prev.point.y-pet.point.y);
      assert.ok(d<=225*.04+.001,"pet teleported");assert.ok(nav.isWalkable(pet.point));assert.ok(nav.visible(prev.point,pet.point));travelled+=d;
      if(prev.direction!==pet.direction)turns.get(pet.id).push(tick);
    }
  }
  assert.ok(travelled>1000);for(const pet of pets.pets.values())assert.ok(pet.point.x>550,"pet could not follow around furniture");
  for(const times of turns.values())for(let i=1;i<times.length;i++)assert.ok(times[i]-times[i-1]>=6,"sprite flip jittered every frame");
  const snapshot=[...pets.pets.values()].map(p=>({...p.point}));
  pets.update(.04,{x:1500,y:850},nav);[...pets.pets.values()].forEach((pet,i)=>assert.ok(Math.hypot(pet.point.x-snapshot[i].x,pet.point.y-snapshot[i].y)<10));
  assert.equal(nav.isWalkable(player),true,"pets modified walkable space");
});
test("shared large object keeps its original inspect outside each precise box; overlapping boxes never grant together",()=>{
  storage.clear();const game=gameFor(1),point={x:700,y:360};
  const common={kind:"container",lootTable:"salvage",position:point,approach:point,visual:{mount:"ground",depth:400,support:"test cart support"},description:"公用余料",emptyText:"已领取"};
  const left={...common,id:"d01-life-left",baked:rectangle(680,320,15,20)},right={...common,id:"d01-life-right",baked:rectangle(705,320,15,20)};
  const original={id:"old-cart",type:"discovery",x:700,y:360,approach:point,baked:rectangle(670,300,70,50),visual:common.visual,atlas:"world-props",frame:0,height:50,
    name:"车",discovery:{id:"old-cart",kind:"inspect",approach:point,description:"观察",result:"观察"},life:left};
  game.entities=[original,lifeEntity(right)];game.player={...point};
  const originalHit=game.hit({x:675,y:315});assert.equal(originalHit.id,"old-cart");assert.equal(originalHit.life,undefined);
  game.interact(originalHit);assert.equal(game.life.containers.length,0);
  const rightHit=game.hit({x:710,y:325});assert.equal(rightHit.life.id,right.id);game.interact(rightHit);
  assert.deepEqual(game.life.containers,[right.id]);
  const leftHit=game.hit({x:685,y:325});assert.equal(leftHit.life.id,left.id);game.interact(leftHit);
  assert.deepEqual(game.life.containers,[right.id,left.id]);game.destroy();
});
test("safe ground fallback does not replace the intended destination of a temporary hazard with a permanent edge stop",()=>{
  storage.clear();const game=gameFor(1);
  game.nav=new Navigation([{name:"floor",polygon:rectangle(0,0,1000,800)}]);game.player={x:150,y:300};
  const target={x:600,y:300};game.blocked=p=>p.x>570&&p.x<630&&p.y>270&&p.y<330;
  game.navigate(target,null,false);assert.deepEqual(game.destination,target);
  for(let i=0;i<2000&&!game.waiting;i++)game.update(.04);
  assert.equal(game.waiting,true);assert.ok(game.player.x<570);
  game.blocked=()=>false;finish(game);for(let i=0;i<500&&(game.waiting||game.path.length);i++)game.update(.04);
  assert.ok(Math.hypot(game.player.x-target.x,game.player.y-target.y)<.01);game.destroy();
});
test("hovering a shared small container outlines only its own physical box, not the entire legacy cart",()=>{
  storage.clear();const game=gameFor(1),traced=[];
  game.ctx={save(){},restore(){},beginPath(){},closePath(){},clip(){},stroke(){},
    moveTo(x,y){traced.push({x,y});},lineTo(x,y){traced.push({x,y});}};
  game.redrawWorldBacking=()=>{};
  const box=rectangle(700,330,18,22),cart=rectangle(660,310,100,55);
  const entity={id:"shared-cart",type:"discovery",name:"车",x:700,y:355,approach:{x:700,y:380},baked:cart,
    visual:{mount:"ground",depth:380,support:"cart"},atlas:"world-props",frame:0,height:40,
    discovery:{id:"shared-cart",kind:"inspect"},life:{id:"d01-life-box",baked:box,kind:"container"}};
  game.hovered=entity;game.drawEntity(entity);assert.deepEqual(traced,box);
  traced.length=0;game.hovered={...entity,life:undefined};game.drawEntity(entity);assert.deepEqual(traced,cart);
  game.destroy();
});
