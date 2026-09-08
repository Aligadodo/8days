import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./load-source.mjs";
const { Navigation, rectangle, polygon, p, distance } = loadSource("src/campaign/navigation.ts");
const { contactDepthAt, occludesFoot, isPointOccluded, collectSceneOccluders, drawWithOcclusion } = loadSource("src/campaign/occlusion.ts");
const { buildWorldNavigation } = loadSource("src/campaign/worldGeometry.ts");
const { WORLDS } = loadSource("src/campaign/worldDesign.ts");
const { LEVELS } = loadSource("src/campaign/levels.ts");
const { entitiesFor } = loadSource("src/campaign/entities.ts");
const { EXPLORATION_PACKS } = loadSource("src/campaign/exploration/packs.ts");
const floor = [{ name: "test floor", polygon: rectangle(10, 10, 1580, 880) }];
function safe(nav, start, route, blocked = () => false) {
  assert.ok(route.length, "expected a safe fallback, including an unchanged position if necessary");
  for (const point of route) {
    assert.ok(nav.isWalkable(point) && !blocked(point), "unsafe end point");
    assert.ok(nav.visible(start, point, blocked), "segment crosses a wall, water or hazard");
    start = point;
  }
}

test("ground fallback retains one exact endpoint for unobstructed diagonals", () => {
  const nav = new Navigation(floor), start = p(111, 210), wanted = p(815, 612);
  assert.deepEqual(nav.routeNearestReachable(start, wanted), [wanted]);
  assert.equal(nav.components.length, 0, "clear ground clicks need no component flood");
});

test("clicking a distant disconnected island approaches this island's shore, never the other shore", () => {
  const nav = new Navigation([
    { name: "home island", polygon: rectangle(10, 10, 390, 880) },
    { name: "unreachable island", polygon: rectangle(600, 10, 990, 880) },
  ]), start = p(200, 450), wanted = p(800, 450);
  assert.equal(nav.route(start, wanted, () => false, 0).length, 0, "precise interaction remains unreachable");
  const route = nav.routeNearestReachable(start, wanted);
  safe(nav, start, route);
  assert.ok(route.at(-1).x < 391 && route.at(-1).x > 389, "stop at the reachable shore with a full foot clearance");
  assert.ok(distance(route.at(-1), wanted) > 100, "fallback must not depend on the former 100px snap radius");
  const component = nav.components[0], count = nav.components.length;
  for (let i = 0; i < 10; i++) safe(nav, start, nav.routeNearestReachable(start, p(900 + i, 470)));
  assert.equal(nav.components.length, count); assert.equal(nav.components[0], component, "static component cache is reused");
});

test("ground clicks inside a large table fall back safely but cannot make an exact interaction stand on it", () => {
  const nav = new Navigation(floor, [rectangle(350, 200, 400, 400)]), start = p(200, 400), wanted = p(550, 400);
  assert.equal(nav.route(start, wanted, () => false, 0).length, 0);
  const route = nav.routeNearestReachable(start, wanted);
  safe(nav, start, route);
  assert.ok(distance(route.at(-1), wanted) < 215, "select closest connected edge, not a random near-player point");
});

test("a temporary hazard separating a floor also produces a safe same-side fallback", () => {
  const nav = new Navigation(floor), start = p(200, 450), wanted = p(1000, 450);
  const barrier = point => point.x >= 600 && point.x <= 620;
  assert.equal(nav.route(start, wanted, barrier, 0).length, 0);
  const route = nav.routeNearestReachable(start, wanted, barrier);
  safe(nav, start, route, barrier);
  assert.ok(route.at(-1).x < 600 && route.at(-1).x > 595);
  assert.deepEqual(nav.routeNearestReachable(start, wanted), [wanted], "expired hazards must not remain cached as walls");
});

test("fallback never cuts a subpixel wall or crosses touching islands diagonally", () => {
  const wall = new Navigation(floor, [rectangle(500.21, 10, .2, 880)]), start = p(470, 320);
  const route = wall.routeNearestReachable(start, p(700, 320));
  safe(wall, start, route); assert.ok(route.at(-1).x < 491.21);
  const touching = new Navigation([{ name: "A", polygon: rectangle(50,50,80,80) }, { name: "B", polygon: rectangle(130,130,80,80) }]);
  const other = touching.routeNearestReachable(p(80,80), p(175,175)); safe(touching,p(80,80),other);
  assert.ok(other.at(-1).x < 130 && other.at(-1).y < 130);
});

test("sloped support edges use feet at the actor's x, never one global center depth", () => {
  const object = { polygon: rectangle(100,100,300,240), depth: 300, contactLine: [p(100,340),p(400,190)] };
  assert.equal(contactDepthAt(object.contactLine, 200, 300), 290);
  assert.equal(occludesFoot(object,p(150,300)), true);
  assert.equal(occludesFoot(object,p(350,300)), false, "same y on the near side of the sloping wall is not hidden");
  assert.equal(isPointOccluded(p(150,230),p(150,300),[object]),true);
  assert.equal(isPointOccluded(p(350,230),p(350,300),[object]),false);
  assert.equal(contactDepthAt(undefined,200,300),300,"legacy authored horizontal bases still work");
});

test("multiple silhouette clips intersect separately; never XOR overlapping walls or repaint other actors", () => {
  const operations=[];
  const ctx=Object.fromEntries(["save","restore","beginPath","rect","moveTo","lineTo","closePath","clip"].map(name=>[name,(...args)=>operations.push([name,...args])]));
  const a={polygon:rectangle(100,100,100,150),depth:250}, b={polygon:rectangle(150,100,100,150),depth:250};
  drawWithOcclusion(ctx,p(170,180),[a,b],()=>operations.push(["actor"]));
  assert.deepEqual(operations.filter(o=>o[0]==="clip"),[["clip","evenodd"],["clip","evenodd"]]);
  assert.equal(operations.filter(o=>o[0]==="actor").length,1);
  assert.equal(operations.at(-1)[0],"restore");
  operations.length=0;
  drawWithOcclusion(ctx,p(170,280),[a,b],()=>operations.push(["actor"]));
  assert.equal(operations.filter(o=>o[0]==="clip").length,0,"foreground actor must draw whole, without transparency");
});

test("DAY02 opening the partition removes the closed mask, retaining only real sloping wall remnants", () => {
  const world=WORLDS[1], entities=entitiesFor(LEVELS[1]);
  const closed=collectSceneOccluders(world,entities,new Set());
  assert.ok(closed.some(o=>o.name==="office-hidden-door"));
  assert.ok(!closed.some(o=>o.requires==="office-latch"));
  const opened=collectSceneOccluders(world,entities,new Set(["breaker","office-latch"]));
  assert.ok(!opened.some(o=>o.name==="office-hidden-door"),"the closed clickable door polygon must never clip an open doorway");
  assert.equal(opened.filter(o=>o.requires==="office-latch").length,1);
  assert.ok(!opened.some(o=>o.unless==="office-latch"),"closed-only common wall body is replaced by the opened painting's exact silhouette");
  const point=p(930,298), foot=p(930,319);
  assert.equal(isPointOccluded(point,foot,opened),false,"the gap contains real open floor, not the old hidden-door mask");
  const panel=opened.find(o=>o.name.includes("右侧壁板"));
  assert.equal(occludesFoot(panel,p(970,290)),true);
  assert.equal(occludesFoot(panel,p(970,319)),false);
});

test("DAY02 fixed partition panels hide feet behind the closed wall without hiding a foreground actor", () => {
  const world=WORLDS[1], entities=entitiesFor(LEVELS[1]), foot=p(983.5013,247.9892);
  const nav=buildWorldNavigation(world,new Set());
  safe(nav,world.spawn,nav.route(world.spawn,foot,()=>false,0));
  assert.ok(nav.isWalkable(foot),"legal floor behind a painted wall must not be removed to hide an occlusion bug");
  for(const flags of [new Set(),new Set(["breaker","office-latch"])]) {
    const masks=collectSceneOccluders(world,entities,flags), panel=masks.find(o=>o.name.includes("右侧壁板"));
    assert.ok(panel,"fixed wall exists before and after unlocking the door");
    assert.equal(isPointOccluded(foot,foot,masks),true,"QA foot pixel must be behind the real wall, not appear on its cap");
    assert.equal(isPointOccluded(foot,p(foot.x,313),masks),false,"the same body pixel remains visible when its actor stands in front");
    const leftPixel=p(930*1600/1672,326*900/941), leftFoot=p(leftPixel.x,300*900/941);
    assert.equal(isPointOccluded(leftPixel,leftFoot,masks),true,"only the retained left wall's common lower body is present in both states");
  }
});

test("DAY02 open passage has full foot clearance while both retained low-wall bases stay solid", () => {
  const world=WORLDS[1], closed=buildWorldNavigation(world,new Set(["breaker"])), open=buildWorldNavigation(world,new Set(["breaker","office-latch"]));
  assert.equal(closed.route(p(913,257),p(1100,367),()=>false,0).length,0);
  safe(open,p(913,257),open.route(p(913,257),p(1100,367),()=>false,0));
  for(const point of [p(893,337),p(969,302),p(1002,289)]) assert.equal(open.isWalkable(point),false,`retained wall base ${JSON.stringify(point)}`);
  for(const point of [p(913,257),p(930,298),p(951,319),p(991,337),p(1100,367)]) assert.equal(open.isWalkable(point),true,`door floor ${JSON.stringify(point)}`);
});

test("DAY02 narrow sloping desk aisle reaches the west drawer without enlarging floor or furniture gaps", () => {
  const world=WORLDS[1], nav=buildWorldNavigation(world,new Set()), stand=p(330,566);
  const route=nav.route(world.spawn,stand,()=>false,0);
  safe(nav,world.spawn,route);
  assert.deepEqual(route.at(-1),stand,"the drawer uses its authored exact stance, not a ground fallback");
  // Previously individually walkable points had no chain of adjacent 8px cells.
  assert.ok(nav.visible(p(492,500),stand),"the actual oblique aisle permits continuous feet passage");
  for(const point of [p(430,591),p(400,560),p(470,490)]) assert.equal(nav.isWalkable(point),false,"desk and partition footprints remain unchanged");
});

test("DAY04 planning and fractional movement agree at the reading table's exact corner", () => {
  const nav=buildWorldNavigation(EXPLORATION_PACKS[3].room.world,new Set());
  // The +6.4,-4.3 footprint grazes table corner (293,521). Old long-segment
  // arithmetic missed u=-1e-16 while the animated subsegment caught the corner.
  assert.equal(nav.visible(p(300,532),p(268,516)),false,"planner must reject a tangent corner consistently");
  const start=p(1048,390), target=p(238,492), route=nav.route(start,target,()=>false,0);
  safe(nav,start,route); assert.deepEqual(route.at(-1),target);
  for(const stride of [2.17,4.36,7.19]) {
    let position={...start};
    for(const endpoint of route) while(distance(position,endpoint)>.0001) {
      const length=distance(position,endpoint),step=Math.min(length,stride);
      const next=p(position.x+(endpoint.x-position.x)*step/length,position.y+(endpoint.y-position.y)*step/length);
      assert.ok(nav.visible(position,next),`movement cancelled at ${JSON.stringify(position)}`);
      assert.ok(nav.isWalkable(next)); position=next;
    }
    assert.ok(distance(position,target)<.001);
  }
});
