import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadSource } from "./load-source.mjs";
const U=loadSource("src/ui/lifeNavigation.ts");

test("five main destinations are direct; memories/log/save/settings belong to More",()=>{
  for(const top of ["inventory","shop","companions","achievements","more"])assert.equal(U.drawerRoute(top).top,top);
  assert.equal(U.drawerRoute("shop").lifeTab,"exchange");assert.equal(U.drawerRoute("companions").lifeTab,"pets");
  for(const sub of ["memories","journal","save","settings"])assert.equal(U.drawerRoute(sub).top,"more");
  assert.equal(U.drawerRoute("memories").panel,"inventory");assert.equal(U.drawerRoute("journal").panel,"journal");
});
test("achievement cards combine global and local progress without changing save state",()=>{
  const global=[{id:"life-supplies",title:"收集",current:9,target:30,done:false},{id:"life-company",title:"伙伴",current:3,target:3,done:true}];
  const local=[{id:"d03-care",title:"照料",description:"工具、图鉴和浇水",current:2,target:5,done:false}];
  const before=JSON.stringify([global,local]);const cards=U.achievementCards(global,local,3);
  assert.equal(cards.length,3);assert.equal(cards[2].scope,"DAY 3 地方成就");assert.equal(cards[2].current,2);assert.equal(cards[2].condition,"工具、图鉴和浇水");
  assert.ok(cards[0].condition.includes("30"));assert.equal(JSON.stringify([global,local]),before);
  assert.equal(U.filterAchievements(cards,"done").length,1);assert.equal(U.filterAchievements(cards,"pending").length,2);assert.equal(U.filterAchievements(cards,"all").length,3);
});
test("missing legacy local count uses completion only; bounds never show progress above target",()=>{
  const cards=U.achievementCards([],[{id:"old",title:"旧成就",description:"完成本地活动",done:true},{id:"bad",title:"越界",description:"",current:88,target:5,done:true}],1);
  assert.equal(cards[0].current,1);assert.equal(cards[0].target,1);assert.equal(cards[1].current,5);
});
test("first-life guide is optional, hidden behind modals, and independent of old campaign saves",()=>{
  assert.equal(U.showLifeGuide(false,false),true);assert.equal(U.showLifeGuide(true,false),false);assert.equal(U.showLifeGuide(false,true),false);
  const main=readFileSync("src/main.ts","utf8"),css=readFileSync("src/style.css","utf8");
  assert.ok(main.includes("one-more-day:life-guide-016"));assert.ok(main.includes('id="restoreLifeGuide"'));assert.ok(main.includes('id="dismissLifeGuide"'));
  assert.ok(css.includes("pointer-events:none")&&css.includes(".life-onboarding button { pointer-events:auto"));
});
test("UI surfaces shop/achievement labels, flat filters, true supply counts and real-navigation methods",()=>{
  const main=readFileSync("src/main.ts","utf8");
  assert.ok(main.includes("背包 / 商店")&&main.includes("查看成就")&&main.includes("<b>成就</b>"));
  assert.ok(main.includes('id="achievementCards"')&&main.includes('data-achievement-filter="pending"')&&main.includes('data-achievement-filter="done"'));
  assert.ok(main.includes("supply.ready")&&main.includes("supply.coolingGather")&&main.includes("supply.claimedContainers"));
  assert.ok(main.includes("game.focusLife(")&&main.includes("game.findNearbySupply()")&&main.includes("node.expectedLoot"));
  assert.ok(main.includes('data-drawer-target="inventory">去背包出售物资'));
});

test("focus wraps correctly and Shift+Tab from a replaced/hidden target selects the last control",()=>{
  assert.equal(U.nextDrawerFocusIndex(-1,5),0);
  assert.equal(U.nextDrawerFocusIndex(-1,5,true),4);
  assert.equal(U.nextDrawerFocusIndex(0,5,true),4);
  assert.equal(U.nextDrawerFocusIndex(4,5),0);
  assert.equal(U.nextDrawerFocusIndex(99,5,true),4);
  assert.equal(U.nextDrawerFocusIndex(-1,0,true),-1);
});
test("transaction fallback uses visible top tabs or selected supply, including equip/rest replacement",()=>{
  assert.deepEqual(U.transactionFocusKeys("use-trail-snack","inventory","trail-snack"),["use-trail-snack","supply-trail-snack","tab:inventory"]);
  assert.deepEqual(U.transactionFocusKeys("equip-pet-1","companions","wood"),["equip-pet-1","rest-pet-1","tab:companions"]);
  assert.deepEqual(U.transactionFocusKeys("rest-pet-1","companions","wood"),["rest-pet-1","equip-pet-1","tab:companions"]);
  assert.deepEqual(U.transactionFocusKeys("buy-warm-tea","shop","wood"),["buy-warm-tea","tab:shop"]);
  const main=readFileSync("src/main.ts","utf8");
  assert.ok(main.includes("if(open || fromPanel)focusDrawerDestination()"));
  assert.ok(!main.includes('`[data-life-tab="${lifeTab}"]`'));
});
test("guide is above measured minimap by eight pixels and recalculates for collapse or side separation",()=>{
  const frame={left:0,right:390,top:0,bottom:780},guide={left:9,right:381,top:500,bottom:630};
  const minimap={left:248,right:382,top:614,bottom:728},bar={left:9,right:205,top:739,bottom:772};
  assert.equal(U.lifeGuideBottom(frame,guide,[minimap,bar]),174);
  assert.equal(U.lifeGuideBottom(frame,guide,[{...minimap,top:702},bar]),86);
  assert.equal(U.lifeGuideBottom(frame,guide,[{...minimap,left:500,right:634},bar]),76);
  assert.ok(readFileSync("src/main.ts","utf8").includes("new ResizeObserver(positionLifeGuide)"));
});
test("supply wording separates total stock from navigable recommendations without duplicated room hint",()=>{
  const main=readFileSync("src/main.ts","utf8");
  assert.ok(main.includes("尚有物资 ${supply.ready}")&&main.includes("可带路 ${supply.recommendations.length}"));
  assert.ok(main.includes("htmlText(node.distanceLabel)"));
  assert.ok(!main.includes("supply.roomSuggestion?"));
});
