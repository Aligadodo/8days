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
const {createLife,collectLife,lifeAvailable}=loadSource("src/campaign/life/runtime.ts");
const {createEconomy}=loadSource("src/campaign/life/economy.ts");
const {SupplyOpportunityCache,supplyOpportunities,supplyRoute,lifeHoverText,expectedLoot}=loadSource("src/campaign/life/opportunities.ts");
const {Navigation,rectangle,distance,inHazard}=loadSource("src/campaign/navigation.ts");
const {WORLDS}=loadSource("src/campaign/worldDesign.ts");
const hooks={onView(){},onToast(){},onPuzzle(){},onFinal(){},onDeath(){},onComplete(){},onAudio(){}};
const gameFor=(day=1,overrides={})=>{storage.clear();const g=new CampaignGame(new Canvas(),{...hooks,...overrides});g.startLevel(day-1,true);g.level={...g.level,hazards:[]};return g;};
const finish=game=>{for(let i=0;i<7000&&(game.path.length||game.focus||game.pending||game.waiting);i++)game.update(.04);
  assert.ok(!game.path.length&&!game.pending&&!game.focus&&!game.waiting,"resource route/action did not finish");};
const readyRoom=(game,day)=>{const room=EXPLORATION_PACKS[day-1].room;game.images.set(room.id,{complete:true,naturalWidth:1600});return room;};
const node=(id,x,kind="gather",extra={})=>({id,title:`物资-${id}`,kind,position:{x,y:180},approach:{x,y:240},
  baked:rectangle(x-8,165,16,22),visual:{mount:"ground",support:"测试箱"},description:"只取共享份",emptyText:"暂时没有",lootTable:"herbs",renewSeconds:300,...extra});
const context=(nodes,extra={})=>({nodes,state:createLife(),player:{x:80,y:240},nav:new Navigation([{name:"floor",polygon:rectangle(20,20,1000,650)}],[]),
  seen:()=>true,permitted:()=>true,dangerous:()=>false,...extra});

test("supply view excludes inspect, ranks at most three real routes, reports output names and actual lifecycle totals",()=>{
  const nodes=[node("a",130),node("b",180,"container"),node("c",230),node("d",280),node("e",330),node("look",90,"inspect")];
  const c=context(nodes);c.state.containers=["b"];c.state.gathered.e={readyAt:140,cycle:1};c.state.activeSeconds=100;
  const v=supplyOpportunities(c);assert.equal(v.total,5);assert.equal(v.ready,3);assert.equal(v.claimedContainers,1);
  assert.equal(v.coolingGather,1);assert.equal(v.earliestRenewSeconds,40);assert.equal(v.unknown,0);assert.equal(v.canFind,true);
  assert.deepEqual(v.recommendations.map(r=>r.id),["a","c","d"]);
  assert.ok(v.recommendations.every(r=>r.expectedLoot==="芳香草叶 + 金币"&&r.status==="可采集"&&r.distance>0&&r.distanceLabel.includes("步")));
  c.state.gathered={};c.state.containers=[];assert.equal(supplyOpportunities(c).recommendations.length,3);
});

test("unknown resources reveal no title or precise coordinate, and near-but-behind-wall does not count as discovered",()=>{
  const secret=node("secret",250),near=node("near",120),c=context([secret,near],{seen:()=>false});
  c.nav=new Navigation([{name:"floor",polygon:rectangle(20,20,1000,650)}],[rectangle(165,20,30,650)]);
  const v=supplyOpportunities(c);assert.deepEqual(v.recommendations.map(r=>r.id),["near"]);assert.equal(v.unknown,1);
  assert.equal(JSON.stringify(v).includes(secret.title),false);assert.deepEqual(supplyRoute(secret,c),[]);
  c.nodes=[secret];const hidden=supplyOpportunities(c);assert.equal(hidden.canFind,false);assert.match(hidden.reason,/阴影/);
  assert.equal(JSON.stringify(hidden).includes(secret.title),false);
});

test("all-cooling and all-empty explain active-time renewal without proposing inspect or a cross-scene source",()=>{
  const c=context([node("crate",150,"container"),node("plant",210),node("look",90,"inspect")],{roomSuggestion:"街角杂货铺"});
  c.state.containers=["crate"];c.state.gathered.plant={readyAt:500,cycle:1};c.state.activeSeconds=300.2;
  const v=supplyOpportunities(c);assert.equal(v.canFind,false);assert.equal(v.earliestRenewSeconds,200);assert.match(v.reason,/暂停或离线不计时/);assert.match(v.reason,/街角杂货铺/);
  c.nodes=c.nodes.filter(n=>n.kind!=="gather");assert.match(supplyOpportunities(c).reason,/不会通过重进或刷新补发/);
  c.nodes=c.nodes.filter(n=>n.kind==="inspect");assert.equal(supplyOpportunities(c).total,0);assert.match(supplyOpportunities(c).reason,/观察物件不会掉落/);
});

test("only exact reachable and prerequisite-permitted supplies are proposed; warning footprints are never recommended stances or traversed routes",()=>{
  const a=node("a",300),b=node("locked",350),c=context([a,b],{permitted:n=>n.id!=="locked"});
  const danger={x:180,y:205,width:30,height:70};c.dangerous=q=>inHazard(q,danger,14);
  const route=supplyRoute(a,c);assert.ok(route.length>1);assert.ok(distance(route.at(-1),a.approach)<.01);
  assert.ok(route.every((p,i)=>c.nav.visible(i?route[i-1]:c.player,p,c.dangerous)));
  assert.deepEqual(supplyOpportunities(c).recommendations.map(r=>r.id),["a"]);
  c.dangerous=q=>inHazard(q,{x:290,y:230,width:20,height:20},14);assert.deepEqual(supplyOpportunities(c).recommendations,[]);
  c.dangerous=()=>false;c.nav=new Navigation([{name:"floor",polygon:rectangle(20,20,1000,650)}],[rectangle(200,20,30,650)]);
  assert.deepEqual(supplyOpportunities(c).recommendations,[]);assert.match(supplyOpportunities(c).reason,/安全连通路线/);
});

test("route cache avoids repeated A* but updates cooldown text, readiness, fog, prerequisites, position grid, danger and navigation revision",()=>{
  const n=node("a",280),c=context([n]),cache=new SupplyOpportunityCache();let calls=0;
  const route=c.nav.route.bind(c.nav);c.nav.route=(...args)=>{calls++;return route(...args);};
  cache.view(c,"room-a","safe");assert.equal(calls,1);
  for(let i=0;i<100;i++){c.state.activeSeconds+=.1;cache.view(c,"room-a","safe");}assert.equal(calls,1,"unchanged getView must not repeat A*");
  c.player.x+=1;cache.view(c,"room-a","safe");assert.equal(calls,1);
  c.player.x+=24;cache.view(c,"room-a","safe");assert.equal(calls,2);
  cache.view(c,"room-a","warning");assert.equal(calls,3);
  c.state.gathered.a={readyAt:c.state.activeSeconds+60,cycle:1};assert.equal(cache.view(c,"room-a","warning").earliestRenewSeconds,60);
  c.state.activeSeconds+=20;assert.equal(cache.view(c,"room-a","warning").earliestRenewSeconds,40);assert.equal(calls,3);
  c.state.activeSeconds=c.state.gathered.a.readyAt;assert.equal(cache.view(c,"room-a","warning").recommendations.length,1);assert.equal(calls,4);
  c.permitted=()=>false;assert.equal(cache.view(c,"room-a","warning").canFind,false);c.permitted=()=>true;cache.view(c,"room-a","warning");assert.equal(calls,5);
  c.player={x:800,y:240};c.seen=()=>false;assert.equal(cache.view(c,"room-a","warning").unknown,1);
  c.seen=()=>true;cache.view(c,"room-a","warning");assert.equal(calls,6);
  cache.view(c,"room-b","warning");assert.equal(calls,7);
  c.nav={...c.nav,route:c.nav.route,visible:c.nav.visible.bind(c.nav),isWalkable:c.nav.isWalkable.bind(c.nav)};
  // The wrapper binds the original instance so replacement identity alone still forces a new search.
  cache.view(c,"room-b","warning");assert.equal(calls,8);
});

test("fresh DAY01 finder walks rather than teleports, collects after anticipation, preserves mainline and invalidates the ready list",t=>{
  const game=gameFor();t.after(()=>game.destroy());const start={...game.player},view=game.getView().supplies;
  assert.ok(view.recommendations.length,"new player's real spawn needs one visible safe source");
  const chosen=view.recommendations[0],target=LIFE_PACKS[0].outside.find(n=>n.id===chosen.id);
  const before=JSON.stringify(game.economy);assert.equal(game.findNearbySupply().ok,true);assert.deepEqual(game.player,start);assert.equal(JSON.stringify(game.economy),before);
  assert.deepEqual(game.destination,target.approach);game.update(.04);assert.ok(distance(game.player,start)<10,"finder teleported on first frame");
  finish(game);assert.ok(distance(game.player,target.approach)<.1);assert.equal(lifeAvailable(game.life,target),false);
  assert.notEqual(JSON.stringify(game.economy),before);assert.deepEqual([...game.solved],[]);assert.equal(game.getView().supplies.recommendations.some(r=>r.id===chosen.id),false);
  const granted=JSON.stringify(game.economy);assert.equal(game.focusLife(chosen.id).ok,false);assert.equal(JSON.stringify(game.economy),granted);
  game.saveNow();const restored=new CampaignGame(new Canvas(),hooks);restored.startLevel(0);t.after(()=>restored.destroy());assert.equal(lifeAvailable(restored.life,target),false);
});

test("actual CampaignGame getView reuses its route cache while active-time counters continue updating",t=>{
  const game=gameFor();t.after(()=>game.destroy());let calls=0;const route=game.nav.route.bind(game.nav);
  game.nav.route=(...args)=>{calls++;return route(...args);};game.suppliesCache=new SupplyOpportunityCache();
  const first=game.getView().supplies;assert.ok(calls>0);const initialCalls=calls;
  for(let i=0;i<100;i++){game.life.activeSeconds+=.1;assert.deepEqual(game.getView().supplies.recommendations,first.recommendations);}
  assert.equal(calls,initialCalls,"the runtime bypassed its route cache");assert.ok(game.getView().life.activeSeconds>9.9);
  const n=LIFE_PACKS[0].outside.find(n=>n.id===first.recommendations[0].id);collectLife(game.life,game.economy,n);
  assert.equal(game.getView().supplies.recommendations.some(r=>r.id===n.id),false,"runtime reused a consumed recommendation");
});

test("finder rejects paused, stale scene, inspect and newly cooled selections; cache cannot bypass action-time danger check",t=>{
  const game=gameFor();t.after(()=>game.destroy());const n=game.getView().supplies.recommendations[0],node=LIFE_PACKS[0].outside.find(x=>x.id===n.id);
  game.setPaused(true);assert.equal(game.focusLife(n.id).ok,false);assert.equal(game.findNearbySupply().ok,false);game.setPaused(false);
  assert.equal(game.focusLife(LIFE_PACKS[0].inside.find(x=>x.kind==="container").id).ok,false);
  assert.equal(game.focusLife(LIFE_PACKS[0].outside.find(x=>x.kind==="inspect").id).ok,false);
  const hazard={id:"finder-danger",kind:"sign",title:"测试预警",rect:{x:node.approach.x-12,y:node.approach.y-12,width:24,height:24},period:12,warningFrom:5,activeFrom:8};
  game.level={...game.level,hazards:[hazard]};game.hazards.state(hazard).stage="warning";
  assert.equal(game.focusLife(n.id).ok,false);assert.equal(game.getView().supplies.recommendations.some(r=>r.id===n.id),false);
  game.level={...game.level,hazards:[]};collectLife(game.life,game.economy,node);assert.equal(game.focusLife(n.id).ok,false);
  game.switchRoom(readyRoom(game,1));assert.equal(game.focusLife(n.id).ok,false);
});

test("shared sources keep original prerequisites and sequence; completed investigation still permits later harvesting",t=>{
  const game=gameFor();t.after(()=>game.destroy());
  const source={id:"unit-source",kind:"inspect",title:"密码抽屉",approach:{...game.player},position:{...game.player},visual:{mount:"ground",support:"测试共享箱"},description:"先读两页",result:"抽屉可用",requires:["page-a"],sequence:["page-a","page-b"]};
  const pack={...EXPLORATION_PACKS[0],outside:[source]};Object.defineProperty(game,"pack",{get:()=>pack});
  const n=node("unit-life",game.player.x,"container",{position:{...game.player},approach:{...game.player},sharedDiscovery:source.id});Object.defineProperty(game,"lifeNodes",{get:()=>[n]});game.refreshEntities();
  assert.equal(game.getView().supplies.canFind,false);assert.equal(game.focusLife(n.id).ok,false);
  game.discoveryFlags.add("page-a");assert.equal(game.getView().supplies.canFind,false);
  game.discoveryHistory=["page-b","page-a"];assert.equal(game.focusLife(n.id).ok,false);
  game.discoveryHistory=["page-a","page-b"];assert.equal(game.getView().supplies.canFind,true);assert.equal(game.focusLife(n.id).ok,true);finish(game);
  assert.ok(game.discoveryFlags.has(source.id));assert.ok(game.life.containers.includes(n.id));assert.deepEqual([...game.solved],[]);
  game.discoveryHistory=[];assert.equal(game.lifePermitted(n),true,"completed shared investigation must not demand replaying sequence");
});

test("guided movement stops before a newly warning hazard; danger during anticipation cancels collection rather than awarding through it",t=>{
  const game=gameFor();t.after(()=>game.destroy());game.nav=new Navigation([{name:"floor",polygon:rectangle(20,20,1000,650)}],[]);game.player={x:80,y:240};game.updateCritters=()=>{};game.updateHazards=()=>{};
  const n=node("unit-supply",420);Object.defineProperty(game,"lifeNodes",{get:()=>[n]});game.refreshEntities();game.explored=new Set(Array.from({length:1450},(_,i)=>i));
  const h={id:"unit-hazard",kind:"sign",title:"落物",rect:{x:220,y:210,width:60,height:60},period:12,warningFrom:5,activeFrom:8};game.level={...game.level,hazards:[h]};
  assert.equal(game.focusLife(n.id).ok,true);game.hazards.state(h).stage="warning";
  for(let i=0;i<100&&!game.waiting;i++)game.update(.04);assert.equal(game.waiting,true);assert.equal(inHazard(game.player,h.rect,14),false);assert.equal(game.life.gathered[n.id],undefined);
  game.hazards.state(h).stage="spent";finish(game);assert.ok(game.life.gathered[n.id]);
  game.life.gathered={};game.economy.claimed=[];h.rect={x:n.approach.x-12,y:n.approach.y-12,width:24,height:24};
  assert.equal(game.focusLife(n.id).ok,true);game.update(.04);assert.ok(game.pending);game.hazards.state(h).stage="warning";game.update(.04);
  assert.equal(game.pending,null);assert.equal(game.life.gathered[n.id],undefined);assert.equal(game.suppliesRouteActive,false);
});

test("hover exposes short action/output only under the pointer and local achievements show exact progress",t=>{
  const game=gameFor();t.after(()=>game.destroy());const n=LIFE_PACKS[0].outside.find(x=>x.kind==="gather"),c=LIFE_PACKS[0].outside.find(x=>x.kind==="container");
  assert.equal(lifeHoverText(n,game.life).action,"采集");assert.equal(lifeHoverText(c,game.life).action,"打开");assert.match(expectedLoot(n),/草叶|纤维/);
  game.life.gathered[n.id]={readyAt:game.life.activeSeconds+12.1,cycle:1};assert.equal(lifeHoverText(n,game.life).action,"再来 13 秒");game.life.containers.push(c.id);assert.equal(lifeHoverText(c,game.life).action,"已取空");
  const text=[];game.ctx={save(){},restore(){},measureText:s=>({width:s.length*6}),fillRect(){},strokeRect(){},fillText:s=>text.push(s)};
  game.drawLifeHover();assert.deepEqual(text,[]);game.hovered=game.entities.find(e=>e.life?.id===n.id);game.pointer={x:300,y:240};game.drawLifeHover();assert.ok(text.some(s=>s.includes("再来 13 秒")));
  text.length=0;game.setPaused(true);game.drawLifeHover();assert.deepEqual(text,[]);game.setPaused(false);game.hovered=null;game.drawLifeHover();assert.deepEqual(text,[]);
  const a=EXPLORATION_PACKS[0].achievements[0];game.discoveryFlags=new Set(a.requires.slice(0,1));const v=game.getView().exploration.achievements.find(x=>x.id===a.id);assert.equal(v.current,1);assert.equal(v.target,a.requires.length);
});

for(const pack of LIFE_PACKS)for(const inside of [false,true])test(`DAY ${pack.day} ${inside?"inside":"outside"}: every known supply can be selected through public finder and grants at its exact real stance`,t=>{
  const game=gameFor(pack.day);t.after(()=>game.destroy());
  game.level.puzzles.forEach(p=>game.solved.add(p.id));WORLDS[pack.day-1].mechanisms.forEach(m=>game.worldFlags.add(m.id));game.rebuildNavigation();
  const ep=EXPLORATION_PACKS[pack.day-1];[...ep.outside,...ep.room.nodes].forEach(n=>game.discoveryFlags.add(n.id));
  if(inside)game.switchRoom(readyRoom(game,pack.day));game.explored=new Set(Array.from({length:1450},(_,i)=>i));
  const mainBefore=[...game.solved];for(const n of (inside?pack.inside:pack.outside).filter(n=>n.kind!=="inspect")){
    const at={...game.player};assert.equal(game.focusLife(n.id).ok,true,`${n.id}: safe finder rejected real authored stance`);assert.deepEqual(game.player,at);
    assert.ok(distance(game.destination,n.approach)<.01);finish(game);assert.ok(distance(game.player,n.approach)<.1,`${n.id}: collection snapped away from authored stance`);
    assert.equal(lifeAvailable(game.life,n),false,`${n.id}: arrived but did not grant`);
  }assert.deepEqual([...game.solved],mainBefore);
});
