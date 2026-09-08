import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { loadSource } from "./load-source.mjs";
const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) };
class Canvas extends EventTarget {
  width=960; height=540; style={}; dataset={}; getContext(){return {};}
  getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:960,height:540};}
}
globalThis.window = new EventTarget(); window.devicePixelRatio=1;
globalThis.document = new EventTarget(); document.hidden=false; document.getElementById=()=>new Canvas();
globalThis.ResizeObserver=class {observe(){} disconnect(){}};
globalThis.Image=class {decode(){return new Promise(()=>{});}};
globalThis.requestAnimationFrame=()=>0;
const { CampaignGame }=loadSource("src/campaign/CampaignGame.ts");
const { EXPLORATION_PACKS }=loadSource("src/campaign/exploration/packs.ts");
const { allDiscoveries, settleDiscovery, earnedAchievements, roomPortal }=loadSource("src/campaign/exploration/discoveries.ts");
const { restoreCampaignSave }=loadSource("src/campaign/campaignSave.ts");
const { footstepFor }=loadSource("src/campaign/footsteps.ts");
const { canOpenDrawer, hasVisibleModal, trapModalTab }=loadSource("src/ui/modalState.ts");
const { buildWorldNavigation, allWorldFlags }=loadSource("src/campaign/worldGeometry.ts");
const { WORLDS }=loadSource("src/campaign/worldDesign.ts");
const { LEVELS }=loadSource("src/campaign/levels.ts");
const hooks={onView(){},onToast(){},onPuzzle(){},onFinal(){},onDeath(){},onComplete(){},onAudio(){}};
const makeGame=()=>new CampaignGame(new Canvas(),hooks);
const walk=(game,entity)=>{
  game.navigate(entity,entity,false);
  for(let i=0;i<5000 && (game.path.length||game.focus||game.pending);i++) game.update(.04);
  assert.ok(!game.path.length && !game.pending,`${entity.id}: action did not finish`);
};
for(const pack of EXPLORATION_PACKS){
  test(`DAY ${pack.day}: expansion content has real art, unique IDs and coherent optional dependencies`,()=>{
    const nodes=allDiscoveries(pack), ids=new Set(nodes.map(n=>n.id));
    assert.equal(ids.size,nodes.length); assert.ok(pack.room.nodes.length>=6); assert.ok(pack.outside.length>=3);
    assert.ok(nodes.filter(n=>n.reward).length>=3); assert.ok(nodes.some(n=>n.animal)); assert.ok(pack.achievements.length>=2);
    const file=`public${pack.room.background}`; assert.ok(existsSync(file));
    assert.equal(readFileSync(file).subarray(0,8).toString("hex"),"89504e470d0a1a0a");
    for(const n of nodes){
      assert.ok(n.visual.support.length>6,n.id); assert.ok(n.baked || n.art || n.animal,n.id);
      for(const id of [...(n.requires??[]),...(n.sequence??[])]) assert.ok(ids.has(id),`${n.id}->${id}`);
    }
    const reachable=new Set();
    for(let pass=0;pass<nodes.length;pass++) for(const n of nodes) if((n.requires??[]).every(id=>reachable.has(id))) reachable.add(n.id);
    assert.equal(reachable.size,nodes.length,"cyclic collection dependency");
    for(const a of pack.achievements) {assert.ok(a.requires.length); a.requires.forEach(id=>assert.ok(ids.has(id)));}
  });
  test(`DAY ${pack.day}: room doorway, furniture navigation and patrols are physically connected`,()=>{
    const world=WORLDS[pack.day-1], mainNav=buildWorldNavigation(world,allWorldFlags(world,LEVELS[pack.day-1].puzzles.map(p=>p.id)));
    assert.ok(mainNav.route(world.spawn,pack.room.entry.approach,()=>false,0).length,"outdoor door unreachable");
    const nav=buildWorldNavigation(pack.room.world,new Set());
    for(const n of [...pack.room.nodes,{id:"return",approach:pack.room.world.approaches.exit}]) {
      assert.ok(nav.isWalkable(n.approach),n.id); assert.ok(nav.route(pack.room.world.spawn,n.approach,()=>false,0).length,n.id);
    }
    for(const n of allDiscoveries(pack).filter(n=>n.animal)) {
      const active=pack.outside.includes(n)?mainNav:nav;
      const points=[n.position,...(n.patrol??[])];
      for(let i=1;i<points.length;i++) assert.ok(active.route(points[i-1],points[i],()=>false,0).length,n.id);
    }
  });
  test(`DAY ${pack.day}: real entry, optional actions, return and replay preserve collections without main-line rewards`,()=>{
    storage.clear(); const game=makeGame(); game.startLevel(pack.day-1,true);
    game.level={...game.level,hazards:[]};
    // Some sightseeing doors lie beyond a main-world bridge. Open only existing access for this room lifecycle test.
    LEVELS[pack.day-1].puzzles.forEach(p=>game.solved.add(p.id));
    WORLDS[pack.day-1].mechanisms.forEach(m=>game.worldFlags.add(m.id)); game.rebuildNavigation();
    game.images.set(pack.room.id,{complete:true,naturalWidth:1600});
    for(const node of pack.outside) walk(game,game.entities.find(e=>e.id===node.id));
    walk(game,game.entities.find(e=>e.portal)); assert.equal(game.room?.id,pack.room.id);
    const returnPoint={...game.returnPoint}; const flagsBefore=[...game.solved];
    for(let pass=0;pass<pack.room.nodes.length;pass++) for(const n of pack.room.nodes){
      if(game.discoveryFlags.has(n.id)||(n.requires??[]).some(id=>!game.discoveryFlags.has(id))) continue;
      for(const id of n.sequence??[]) walk(game,game.entities.find(e=>e.id===id));
      walk(game,game.entities.find(e=>e.id===n.id));
    }
    for(const n of allDiscoveries(pack)) assert.ok(game.discoveryFlags.has(n.id),n.id);
    const count=game.discoveryFlags.size;
    assert.equal(game.getView().exploration.items.length,allDiscoveries(pack).filter(n=>n.reward).length);
    assert.equal(game.getView().exploration.achievements.filter(a=>a.done).length,pack.achievements.length);
    for(const n of pack.room.nodes) walk(game,game.entities.find(e=>e.id===n.id));
    assert.equal(game.discoveryFlags.size,count,"repeat clicks created new rewards");
    assert.deepEqual([...game.solved],flagsBefore,"optional actions changed main puzzle rewards");
    walk(game,game.entities.find(e=>e.portal)); assert.equal(game.room,null); assert.deepEqual(game.player,returnPoint);
    game.saveNow(); const resumed=makeGame(); resumed.startLevel(pack.day-1,true);
    assert.equal(resumed.discoveryFlags.size,count,"replaying erased the album");
    assert.equal(resumed.visitedRooms.size,1); assert.ok(resumed.activeWorld===WORLDS[pack.day-1]);
    game.destroy();resumed.destroy();
  });
  test(`DAY ${pack.day}: moving animals remain on floor, stop for interactions and freeze while paused`,()=>{
    storage.clear();const game=makeGame();game.startLevel(pack.day-1,true);
    game.images.set(pack.room.id,{complete:true,naturalWidth:1600});
    if(pack.room.nodes.some(n=>n.animal))game.switchRoom(pack.room);
    else game.level={...game.level,hazards:[]};
    const animals=game.entities.filter(e=>e.discovery?.animal);
    assert.ok(animals.length);
    const origins=new Map(animals.map(e=>[e.id,{...game.entityPosition(e)}]));
    let travelled=0;
    for(let tick=0;tick<2000;tick++){
      const before=new Map(animals.map(e=>[e.id,{...game.entityPosition(e)}]));game.update(.04);
      for(const e of animals){const now=game.entityPosition(e),prior=before.get(e.id);
        assert.ok(game.nav.isWalkable(now),e.id);assert.ok(game.nav.visible(prior,now),`${e.id} crossed furniture`);
        travelled+=Math.hypot(now.x-prior.x,now.y-prior.y);
      }
    }
    assert.ok(travelled>50,"the animal never actually moved");
    const frozen=JSON.stringify([...game.critters]),time=game.elapsedSeconds;game.setPaused(true);
    for(let i=0;i<100;i++)game.update(.04);
    assert.equal(JSON.stringify([...game.critters]),frozen);assert.equal(game.elapsedSeconds,time);
    game.setPaused(false);const pet=animals[0];game.focus=pet;const p={...game.entityPosition(pet)};
    game.updateCritters(5);assert.deepEqual(game.entityPosition(pet),p,"pet moved away from the approaching player");
    assert.equal(origins.size,animals.length);game.destroy();
  });
}
test("discoveries enforce prerequisites and sequence, de-duplicate rewards and unlock explicit achievements",()=>{
  const tool={id:"tool",title:"小钥匙",kind:"collect",description:"找钥匙",result:"找到"};
  const a={id:"a",kind:"inspect",result:"响一声"},b={id:"b",kind:"inspect",result:"响两声"};
  const lock={id:"lock",title:"盒子",kind:"restore",requires:["tool"],sequence:["a","b"],description:"先一声再两声",result:"打开"};
  const nodes=[tool,a,b,lock], flags=new Set(), history=[];
  assert.equal(settleDiscovery(lock,nodes,flags,history).status,"locked");
  settleDiscovery(tool,nodes,flags,history);settleDiscovery(b,nodes,flags,history);settleDiscovery(a,nodes,flags,history);
  assert.equal(settleDiscovery(lock,nodes,flags,history).status,"sequence");
  settleDiscovery(a,nodes,flags,history);settleDiscovery(b,nodes,flags,history);
  assert.equal(settleDiscovery(lock,nodes,flags,history).status,"new");
  assert.equal(settleDiscovery(lock,nodes,flags,history).status,"repeat");
  assert.equal(flags.size,4); assert.equal(earnedAchievements({achievements:[{id:"done",requires:["lock"]}]},flags).length,1);
});
test("all eight real expansion packs are registered exactly once",()=>{
  assert.deepEqual(EXPLORATION_PACKS.map(p=>p.day),[1,2,3,4,5,6,7,8]);
  assert.equal(new Set(EXPLORATION_PACKS.flatMap(p=>allDiscoveries(p).map(n=>n.id))).size,
    EXPLORATION_PACKS.reduce((count,p)=>count+allDiscoveries(p).length,0));
});
test("inspection history remains bounded after repeated notes without losing latest sequence",()=>{
  const n={id:"bell",kind:"inspect",result:"响了"},flags=new Set(),history=[];
  for(let i=0;i<300;i++)settleDiscovery(n,[n],flags,history);
  assert.equal(history.length,20);assert.ok(history.every(id=>id===n.id));assert.equal(flags.size,1);
});
test("return portals preserve authored depth rather than sorting a doorway at its arbitrary center",()=>{
  for(const pack of EXPLORATION_PACKS){
    const portal=roomPortal(pack.room,true);
    assert.equal(portal.visual.depth,pack.room.world.visuals.exit?.depth);
    assert.deepEqual(portal.approach,pack.room.world.approaches.exit);
  }
});
test("missing or failed room art leaves a working outdoor world and does not mark a visit",()=>{
  storage.clear();const messages=[];const game=new CampaignGame(new Canvas(),{...hooks,onToast:m=>messages.push(m)});
  game.startLevel(0,true);const pack=EXPLORATION_PACKS[0],pos={...game.player},fog=[...game.explored];
  for(const image of [undefined,{complete:false,naturalWidth:1600},{complete:true,naturalWidth:0}]){
    game.images.set(pack.room.id,image);game.switchRoom(pack.room);
    assert.equal(game.room,null);assert.deepEqual(game.player,pos);assert.deepEqual([...game.explored],fog);
    assert.equal(game.visitedRooms.size,0);assert.equal(game.paused,false);
  }
  assert.ok(messages.filter(m=>m.includes("房间图片尚未载入")).length===3);game.destroy();
});
test("room fog is separate, outdoor checkpoint is retained, and an indoor save resumes safely outside",()=>{
  storage.clear();const game=makeGame(),pack=EXPLORATION_PACKS[0];game.startLevel(0,true);
  game.player={...pack.room.entry.approach};game.explored=new Set([0,1,2]);
  const outside={...game.player};game.images.set(pack.room.id,{complete:true,naturalWidth:1600});game.switchRoom(pack.room);
  game.explored=new Set([1100,1101,1102]);game.saveNow();
  const saved=game.getSave().levels[game.level.id];
  assert.deepEqual(saved.explored,[0,1,2]);assert.deepEqual(saved.roomExplored[pack.room.id],[1100,1101,1102]);
  assert.deepEqual(saved.checkpoint,outside);
  const reloaded=makeGame();reloaded.startLevel(0);
  assert.equal(reloaded.room,null);assert.deepEqual(reloaded.player,outside);
  assert.deepEqual(reloaded.roomExplored[pack.room.id],[1100,1101,1102]);
  game.switchRoom(null);assert.deepEqual(game.player,outside);
  assert.ok(!game.explored.has(1101),"interior fog leaked into the outdoor minimap");
  game.switchRoom(pack.room);assert.ok(game.explored.has(1101),"interior fog disappeared on return");
  game.destroy();reloaded.destroy();
});
test("outdoor hazards cannot advance, block navigation or kill while inside a safe room",()=>{
  storage.clear();const game=makeGame(),pack=EXPLORATION_PACKS[0];game.startLevel(0,true);
  const hazard=game.level.hazards[0],state=game.hazards.state(hazard);state.stage="warning";state.age=.75;
  game.images.set(pack.room.id,{complete:true,naturalWidth:1600});game.switchRoom(pack.room);
  const before={...state};for(let i=0;i<500;i++)game.update(.04);
  assert.deepEqual(state,before);assert.deepEqual(game.activeHazards,[]);assert.equal(game.dead,false);
  state.stage="active";assert.equal(game.blocked({x:hazard.rect.x+10,y:hazard.rect.y+10}),false);
  game.switchRoom(null);assert.ok(game.activeHazards.length);game.destroy();
});
test("cancelled and stale shared-door callbacks cannot move the player, while investigate still opens the main puzzle",()=>{
  storage.clear();let choice,opened;
  const game=new CampaignGame(new Canvas(),{...hooks,onDoorChoice:(_,enter,inspect)=>choice={enter,inspect},onPuzzle:p=>opened=p.id});
  const pack=EXPLORATION_PACKS.find(p=>p.room.entry.sharedTarget && p.room.entry.sharedTarget!=="exit");
  game.startLevel(pack.day-1,true);game.level={...game.level,hazards:[]};
  game.images.set(pack.room.id,{complete:true,naturalWidth:1600});
  const task=game.entities.find(e=>e.id===pack.room.entry.sharedTarget);
  for(const id of game.level.puzzles.find(p=>p.id===task.id).requires??[])game.solved.add(id);
  game.rebuildNavigation();walk(game,game.entities.find(e=>e.portal));assert.equal(game.paused,true);
  game.setPaused(false);choice.enter();assert.equal(game.room,null,"cancelled door dialog entered anyway");
  walk(game,game.entities.find(e=>e.portal));choice.inspect();
  for(let i=0;i<2000 && !opened;i++)game.update(.04);
  assert.equal(opened,task.id,"shared entrance stole the original puzzle");
  game.setPaused(false);walk(game,game.entities.find(e=>e.portal));const old=choice;
  game.startLevel(0,true);old.enter();assert.equal(game.room,null);assert.equal(game.level.day,1);
  game.destroy();
});
test("collections and achievements survive an outdoor death and only a deliberate campaign reset erases them",()=>{
  storage.clear();const game=makeGame(),pack=EXPLORATION_PACKS[0];game.startLevel(0,true);
  allDiscoveries(pack).forEach(n=>game.discoveryFlags.add(n.id));game.visitedRooms.add(pack.room.id);game.persist();
  const count=game.discoveryFlags.size;game.beginDeath(game.level.hazards[0]);
  game.deathScene.delivered=true;game.restartAfterDeath();
  assert.equal(game.discoveryFlags.size,count);assert.equal(game.getView().exploration.achievements.filter(a=>a.done).length,2);
  const reloaded=makeGame();reloaded.startLevel(0);assert.equal(reloaded.discoveryFlags.size,count);
  reloaded.resetCampaignSave();assert.equal(reloaded.discoveryFlags.size,0);assert.equal(reloaded.visitedRooms.size,0);
  game.destroy();reloaded.destroy();
});
test("v2 save migration preserves valid main and album progress while discarding malformed fields and foreign IDs",()=>{
  const pack=EXPLORATION_PACKS[0],level=LEVELS[0],id=allDiscoveries(pack)[0].id;
  const restored=restoreCampaignSave({version:2,unlocked:9.8,completed:[level.id,level.id,"unknown"],levels:{
    [level.id]:{solved:[level.puzzles[0].id,"foreign"],sideTasks:"not-array",worldFlags:{},discoveries:[id,id,7,"d08-fake"],
      visitedRooms:[pack.room.id,"d08-room"],roomExplored:{[pack.room.id]:[0,0,1449,1450,-1,"20",1.5],foreign:[1]},
      explored:"oops",hintStages:{[level.puzzles[0].id]:99,foreign:3},checkpoint:{x:"bad",y:NaN},deaths:-3,hintsUsed:null},
    [LEVELS[1].id]:null,foreign:{discoveries:["bad"]}}});
  assert.equal(restored.unlocked,8);assert.deepEqual(restored.completed,[level.id]);
  const result=restored.levels[level.id];assert.deepEqual(result.solved,[level.puzzles[0].id]);assert.deepEqual(result.discoveries,[id]);
  assert.deepEqual(result.sideTasks,[]);assert.deepEqual(result.visitedRooms,[pack.room.id]);assert.deepEqual(result.roomExplored,{[pack.room.id]:[0,1449]});
  assert.equal(result.checkpoint,undefined);assert.equal(result.deaths,0);assert.equal(result.hintStages[level.puzzles[0].id],3);
  assert.equal(restored.levels.foreign,undefined);
  storage.set("one-more-day:campaign:v2",JSON.stringify({version:2,levels:{[level.id]:{discoveries:7,visitedRooms:"room",roomExplored:{[pack.room.id]:{oops:1}}}}}));
  const game=makeGame();assert.doesNotThrow(()=>game.startLevel(0));assert.equal(game.discoveryFlags.size,0);game.destroy();
  assert.equal(restoreCampaignSave({version:1}).unlocked,1);
});
test("shared-door modality prevents backpack opening or closing from unpausing its pending choice",()=>{
  storage.clear();let enter;
  const game=new CampaignGame(new Canvas(),{...hooks,onDoorChoice:(_,callback)=>enter=callback});
  const pack=EXPLORATION_PACKS[2];game.startLevel(2,true);
  game.images.set(pack.room.id,{complete:true,naturalWidth:1600});
  game.player={...pack.room.entry.approach};game.interact(game.entities.find(e=>e.portal));
  assert.equal(game.paused,true);
  // No active animation class is required: visibility alone owns the pause.
  const overlays=[{hidden:true},{hidden:false}];
  assert.equal(canOpenDrawer(overlays,false),false);
  if(!hasVisibleModal(overlays))game.setPaused(false);
  assert.equal(game.paused,true,"closing a drawer resumed the world behind the door");
  enter();assert.equal(game.room.id,pack.room.id,"modal choice stopped working after a drawer request");
  assert.equal(game.paused,false);
  overlays[1].hidden=true;assert.equal(canOpenDrawer(overlays,false),true);assert.equal(canOpenDrawer(overlays,true),false);
  const source=readFileSync("src/main.ts","utf8");
  assert.match(source,/blockingOverlays = \(\) => \[[^;]*byId\("doorOverlay"\)/);
  assert.match(source,/if \(!canOpenDrawer\(blockingOverlays\(\), game\.isInDeathSequence\(\)\)\) return/);
  assert.match(source,/if \(!hasVisibleModal\(blockingOverlays\(\)\)\) game\.setPaused\(false\)/);
  game.destroy();
});
test("Tab and Shift+Tab remain within the visible door dialog and stop trapping after cancel",()=>{
  let focused=null,prevented=0;
  const buttons=[0,1,2].map(id=>({id,hidden:false,focus(){focused=this;}}));
  const overlay={hidden:false,querySelectorAll:()=>buttons};
  const key={key:"Tab",shiftKey:false,preventDefault(){prevented++;}};
  assert.equal(trapModalTab(key,overlay,buttons[2]),true);assert.equal(focused,buttons[0]);
  trapModalTab({...key,shiftKey:true},overlay,buttons[0]);assert.equal(focused,buttons[2]);
  trapModalTab(key,overlay,null);assert.equal(focused,buttons[0]);
  assert.equal(prevented,3);overlay.hidden=true;
  assert.equal(trapModalTab(key,overlay,buttons[2]),false);assert.equal(prevented,3);
});
test("footstep material follows explicit flooring and distinguishes the mixed DAY03 wood/tile seam",()=>{
  const p={x:600,y:600};
  for(const region of ["候车厅与整理角连续木地板","原木地坪","山间木栈道","码头"])
    assert.equal(footstepFor(region,p),"footstep.wood",region);
  for(const region of ["石门槛","陶砖地","石桥","山中石台阶","连续石地"])
    assert.equal(footstepFor(region,p),"footstep.stone",region);
  assert.equal(footstepFor("花谷草地",p),"footstep.grass");
  assert.equal(footstepFor("工房木地板与温室陶砖地",{x:700,y:600},"d03-room"),"footstep.wood");
  assert.equal(footstepFor("工房木地板与温室陶砖地",{x:1050,y:600},"d03-room"),"footstep.stone");
  assert.equal(footstepFor("低石拱返回口",p,"d03-room"),"footstep.stone");
});
test("actual indoor movement plays wood in DAY07 and changes to stone when crossing DAY03's painted floor seam",()=>{
  storage.clear();const cues=[];const game=new CampaignGame(new Canvas(),{...hooks,onAudio:c=>cues.push(c.id)});
  const move=(to)=>{game.navigate(to,null,false);for(let i=0;i<2000 && game.path.length;i++)game.update(.04);
    assert.ok(Math.hypot(game.player.x-to.x,game.player.y-to.y)<.01);};
  game.startLevel(6,true);game.images.set("d07-room",{complete:true,naturalWidth:1600});game.switchRoom(EXPLORATION_PACKS[6].room);
  const destination=EXPLORATION_PACKS[6].room.nodes.find(n=>n.id==="d07-travel-card").approach;
  move(destination);assert.ok(cues.includes("footstep.wood"),"wooden waiting room still played only stone");
  game.startLevel(2,true);game.images.set("d03-room",{complete:true,naturalWidth:1600});game.switchRoom(EXPLORATION_PACKS[2].room);
  game.player={x:700,y:650};assert.ok(game.nav.isWalkable(game.player));cues.length=0;
  move({x:1080,y:650});const steps=cues.filter(id=>id.startsWith("footstep."));
  assert.ok(steps.length>2);assert.equal(steps[0],"footstep.wood");assert.equal(steps.at(-1),"footstep.stone");
  game.destroy();
});
