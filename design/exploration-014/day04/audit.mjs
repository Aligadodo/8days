// Run from the game root: node --test design/exploration-014/day04/audit.mjs
// Direct pack import; no public registry mutation, browser, server or user storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSource } from '../../../tests/load-source.mjs';

const pack = loadSource('src/campaign/exploration/day04.ts').default;
const outside = loadSource('src/campaign/worlds/day04.ts').default;
const { buildWorldNavigation } = loadSource('src/campaign/worldGeometry.ts');
const { allDiscoveries, settleDiscovery, earnedAchievements } = loadSource('src/campaign/exploration/discoveries.ts');
const { artBounds } = loadSource('src/campaign/SceneRaster.ts');
const nodes = allDiscoveries(pack);
const nav = buildWorldNavigation(pack.room.world, new Set());
const p = (x,y) => ({x,y});
const exact = (navigation, from, to, label) => {
  assert.ok(navigation.isWalkable(to), `${label}: blocked destination`);
  const route = navigation.route(from,to,()=>false,0);
  assert.ok(route.length, `${label}: no exact route`);
  assert.deepEqual(route.at(-1),to,`${label}: snapped destination`);
  let previous = from;
  for (const point of route) {
    assert.ok(navigation.visible(previous,point),`${label}: invalid route segment`);
    previous=point;
  }
};
const png = (path) => {
  const bytes=readFileSync(path);
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a',path);
  return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
};

test('DAY04 budget, unique IDs, existing acyclic prerequisites and achievement conditions',()=>{
  assert.equal(pack.room.nodes.length,10); assert.equal(pack.outside.length,3);
  assert.equal(nodes.filter(n=>n.reward).length,5);
  assert.equal(nodes.filter(n=>n.kind==='photo').length,2);
  assert.equal(nodes.filter(n=>n.animal).length,1);
  assert.equal(pack.achievements.length,2);
  const ids=new Set(nodes.map(n=>n.id)); assert.equal(ids.size,13);
  for(const n of nodes) {
    assert.ok(n.id.startsWith('d04-')); assert.ok(n.visual.support);
    assert.ok(n.baked || n.art || n.animal,n.id);
    for(const id of [...(n.requires??[]),...(n.sequence??[])]) assert.ok(ids.has(id),id);
    for(const id of n.sequence??[]) assert.ok(pack.room.nodes.some(x=>x.id===id&&x.kind==='inspect'));
  }
  const completed=new Set();
  for(let i=0;i<nodes.length;i++) for(const n of nodes)
    if((n.requires??[]).every(id=>completed.has(id))) completed.add(n.id);
  assert.equal(completed.size,13,'dependency cycle');
  for(const a of pack.achievements) {
    assert.ok(a.requires.length); a.requires.forEach(id=>assert.ok(ids.has(id)));
    for(const absent of a.requires) {
      const flags=new Set(a.requires.filter(id=>id!==absent));
      assert.ok(!earnedAchievements(pack,flags).some(x=>x.id===a.id),`${a.id}: premature unlock`);
    }
    assert.ok(earnedAchievements(pack,new Set(a.requires)).some(x=>x.id===a.id));
  }
});

test('DAY04 real shared door requires lily-path; outdoor discoveries remain initially reachable',()=>{
  const closed=buildWorldNavigation(outside,new Set());
  const opened=buildWorldNavigation(outside,new Set(['lily-path']));
  assert.equal(pack.room.entry.sharedTarget,'exit');
  assert.deepEqual(pack.room.entry.position,outside.positions.exit);
  assert.deepEqual(pack.room.entry.approach,outside.approaches.exit);
  assert.deepEqual(pack.room.entry.baked,outside.baked.exit);
  assert.equal(closed.route(outside.spawn,pack.room.entry.approach,()=>false,0).length,0);
  exact(opened,outside.spawn,pack.room.entry.approach,'lily-path entry');
  exact(opened,pack.room.entry.approach,outside.spawn,'outdoor return');
  for(const n of pack.outside) exact(closed,outside.spawn,n.approach,n.id);
});

test('DAY04 every indoor interaction can be approached and returned from, without crossing furniture',()=>{
  const spawn=pack.room.world.spawn, exit=pack.room.world.approaches.exit;
  exact(nav,spawn,exit,'return');
  for(const n of pack.room.nodes) {
    exact(nav,spawn,n.approach,n.id);
    exact(nav,n.approach,exit,`${n.id} return`);
  }
  const negatives=[[819,440],[385,465],[390,529],[1000,320],[1200,350],[1409,453],[709,755],[900,755],[520,160],[486,345],[220,620],[150,590]];
  for(const [x,y] of negatives) assert.equal(nav.isWalkable(p(x,y)),false,`negative ${x},${y}`);
  assert.equal(nav.visible(p(760,440),p(880,440)),false,'partition shortcut');
  const cat=nodes.find(n=>n.animal);
  const points=[cat.position,...cat.patrol,cat.patrol[0]];
  for(let i=1;i<points.length;i++) assert.ok(nav.visible(points[i-1],points[i]),`cat segment ${i}`);
});

test('DAY04 source assets, finite crop bounds and exact paper afterArt registration',()=>{
  const map=png(`public${pack.room.background}`);
  assert.deepEqual(map,{width:1672,height:941});
  assert.deepEqual(readFileSync(`public${pack.room.background}`),readFileSync('design/exploration-014/day04/water-observatory-source.png'));
  for(const n of nodes) for(const art of [n.art,n.afterArt].filter(Boolean)) {
    const source=png(`public${art.src}`), c=art.crop;
    assert.ok(art.width>0&&art.height>0);
    if(c) assert.ok(c.x>=0&&c.y>=0&&c.width>0&&c.height>0&&c.x+c.width<=source.width&&c.y+c.height<=source.height);
    const b=artBounds(art,n.position);
    assert.ok(Object.values(b).every(Number.isFinite));
  }
  const recorder=nodes.find(n=>n.id==='d04-recorder');
  const art=recorder.afterArt, c=art.crop, b=artBounds(art,recorder.position);
  const expected={x:c.x*1600/map.width,y:c.y*900/map.height,w:c.width*1600/map.width,h:c.height*900/map.height};
  for(const key of Object.keys(b)) assert.ok(Math.abs(b[key]-expected[key])<1e-9,`paper registration ${key}`);
  assert.ok(b.x>=1179&&b.y>=274&&b.x+b.w<=1237&&b.y+b.h<=328,'patch escaped paper');
  assert.deepEqual(readFileSync(`public${art.src}`),readFileSync('design/exploration-014/day04/recorder-restored-source.png'));
});

test('DAY04 repair blocks every missing prerequisite; repeated rewards and reload flags stay idempotent',()=>{
  const recorder=nodes.find(n=>n.id==='d04-recorder'), chart=nodes.find(n=>n.id==='d04-chart');
  for(const missing of recorder.requires) {
    const flags=new Set(recorder.requires.filter(id=>id!==missing));
    assert.equal(settleDiscovery(recorder,nodes,flags,[]).status,'locked');
    assert.ok(!flags.has(recorder.id));
    assert.equal(settleDiscovery(chart,nodes,flags,[]).status,'locked');
  }
  const flags=new Set(), history=[];
  for(const n of nodes) assert.equal(settleDiscovery(n,nodes,flags,history).status,'new',n.id);
  assert.equal(earnedAchievements(pack,flags).length,2);
  for(const n of nodes) assert.equal(settleDiscovery(n,nodes,flags,history).status,'repeat',n.id);
  const restored=new Set(JSON.parse(JSON.stringify([...flags])));
  for(const n of nodes) assert.equal(settleDiscovery(n,nodes,restored,[]).status,'repeat');
  assert.equal(restored.size,13); assert.equal(nodes.filter(n=>n.reward&&restored.has(n.id)).length,5);
});

test('DAY04 isolated shared-runtime lifecycle: entry, all actions, exact return, repeat and saved album',()=>{
  const storage=new Map();
  globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
  class Canvas extends EventTarget {
    width=960; height=540; style={}; dataset={}; getContext(){return {};}
    getBoundingClientRect(){return {x:0,y:0,left:0,top:0,width:960,height:540};}
  }
  globalThis.window=new EventTarget(); window.devicePixelRatio=1;
  globalThis.document=new EventTarget(); document.hidden=false; document.getElementById=()=>new Canvas();
  globalThis.ResizeObserver=class {observe(){} disconnect(){}};
  globalThis.Image=class {decode(){return new Promise(()=>{});}};
  globalThis.requestAnimationFrame=()=>0;
  const {CampaignGame}=loadSource('src/campaign/CampaignGame.ts');
  // Inject only this instance's pack getter. No registry changes, including in memory.
  const make=()=>{
    const game=new CampaignGame(new Canvas(),{onView(){},onToast(){},onPuzzle(){},onFinal(){},onDeath(){},onComplete(){},onAudio(){}});
    Object.defineProperty(game,'pack',{get:()=>pack});
    game.startLevel(3,true);
    game.level={...game.level,hazards:[]};
    game.images.set(pack.room.id,{complete:true,naturalWidth:1672});
    return game;
  };
  const walk=(game,id)=>{
    const entity=game.entities.find(e=>e.id===id); assert.ok(entity,id);
    game.navigate(entity.approach,entity,false);
    for(let i=0;i<5000&&(game.path.length||game.focus||game.pending);i++) game.update(.04);
    assert.ok(!game.path.length&&!game.focus&&!game.pending,`${id}: action unfinished`);
  };
  const game=make();
  try {
    for(const n of pack.outside) walk(game,n.id);
    game.solved.add('lily-path'); game.rebuildNavigation();
    walk(game,`${pack.room.id}-enter`); assert.equal(game.room?.id,pack.room.id);
    const returnPoint={...game.returnPoint}, mainFlags=[...game.solved];
    walk(game,'d04-recorder'); assert.ok(!game.discoveryFlags.has('d04-recorder'));
    walk(game,'d04-chart'); assert.ok(!game.discoveryFlags.has('d04-chart'));
    for(const n of pack.room.nodes) walk(game,n.id);
    assert.equal(game.discoveryFlags.size,13);
    assert.equal(game.explorationView().items.length,5);
    assert.equal(game.explorationView().achievements.filter(a=>a.done).length,2);
    assert.deepEqual([...game.solved],mainFlags);
    walk(game,`${pack.room.id}-return`); assert.equal(game.room,null);
    assert.deepEqual(game.player,returnPoint);
    walk(game,`${pack.room.id}-enter`);
    for(const n of pack.room.nodes.filter(n=>n.reward)) walk(game,n.id);
    assert.equal(game.explorationView().items.length,5);
    walk(game,`${pack.room.id}-return`); game.saveNow();
    const resumed=make();
    try {
      assert.equal(resumed.room,null); assert.equal(resumed.discoveryFlags.size,13);
      assert.equal(resumed.visitedRooms.size,1); assert.equal(resumed.explorationView().items.length,5);
      assert.equal(resumed.explorationView().achievements.filter(a=>a.done).length,2);
    } finally {resumed.destroy();}
  } finally {game.destroy();}
});
