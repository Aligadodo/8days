import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./load-source.mjs";
const {
  HazardDirector,
  hazardProfile,
  hazardCenter,
  hazardContact,
  deathStage,
  gameTime,
} = loadSource("src/campaign/hazardDirector.ts");
const { LEVELS } = loadSource("src/campaign/levels.ts");
const { Navigation, inHazard } = loadSource("src/campaign/navigation.ts");
const { WORLDS } = loadSource("src/campaign/worldDesign.ts");
const sign = LEVELS[0].hazards.find((h) => h.id === "falling-sign");
const center = hazardCenter(sign);

test("all 16 hazards have explicit event grammar and at least 1.5 seconds of warning", () => {
  const hazards = LEVELS.flatMap((level) => level.hazards);
  assert.equal(hazards.length, 16);
  for (const h of hazards) {
    const p = hazardProfile(h);
    assert.ok(p.warning >= 1.5, h.id);
    assert.ok(p.release > 0 && p.active > 0 && p.recovery > 0);
    assert.ok(p.warnSound && p.impactSound && p.impactText);
  }
  assert.equal(hazardProfile(sign).warning, 1.5);
});
test("a distant, hidden or protected sign cannot arm even after a long time", () => {
  const director = new HazardDirector();
  director.update(sign, 300, center, true, false);
  director.update(sign, 300, center, false, true);
  director.update(sign, 300, { x: 0, y: 0 }, true, true);
  assert.equal(director.state(sign).stage, "dormant");
  assert.equal(
    director.update(sign, 300, center, true, true)[0].type,
    "warning",
  );
  assert.equal(director.state(sign).age, 0);
});
test("low frame rates cannot skip warning or falling presentation; collision is only at contact", () => {
  const d = new HazardDirector();
  d.update(sign, 0.02, center, true, true);
  d.update(sign, 1.49, center, true, true);
  assert.equal(d.state(sign).stage, "warning");
  const release = d.update(sign, 3, center, true, true);
  assert.equal(d.state(sign).stage, "release");
  assert.equal(d.lethal(sign, release), false);
  const impact = d.update(sign, 0.42, center, true, true);
  assert.equal(d.lethal(sign, impact), true);
  assert.equal(d.lethal(sign, d.update(sign, 0.01, center, true, true)), false);
});
test("successful escape emits one acknowledgement and leaves a spent object", () => {
  const d = new HazardDirector(),
    safe = { x: 1000, y: 345 };
  d.update(sign, 0.01, center, true, true);
  d.update(sign, 1.5, safe, true, true);
  const events = d.update(sign, 0.42, safe, true, true);
  assert.equal(events.filter((e) => e.type === "avoided").length, 1);
  d.update(sign, 0.28, safe, true, true);
  d.update(sign, 0.85, safe, true, true);
  assert.equal(d.state(sign).stage, "spent");
  assert.deepEqual(d.update(sign, 999, center, true, true), []);
});
test("sign has reachable strike ground and direct left and right escape routes", () => {
  const nav = new Navigation(WORLDS[0].regions, WORLDS[0].blockers);
  assert.ok(nav.isWalkable(center));
  for (const safe of [
    { x: 755, y: 340 },
    { x: 990, y: 350 },
  ]) {
    assert.ok(nav.visible(center, safe));
    assert.equal(inHazard(safe, sign.rect, 5), false);
  }
});
test("recurring danger clears, rests and replays its full warning instead of global phase jump", () => {
  const h = LEVELS[0].hazards[0],
    p = hazardProfile(h),
    d = new HazardDirector(),
    q = hazardCenter(h);
  d.update(h, 0.02, q, true, true);
  d.update(h, p.warning, q, true, true);
  d.update(h, p.release, q, true, true);
  assert.equal(d.lethal(h, []), true);
  d.update(h, p.active, q, true, true);
  assert.equal(d.lethal(h, []), false);
  d.update(h, p.recovery, q, true, true);
  d.update(h, 0.02, q, true, true);
  assert.equal(d.state(h).stage, "dormant");
  d.update(h, 4, q, true, true);
  assert.equal(d.state(h).stage, "warning");
  assert.equal(d.state(h).age, 0);
});
test("solving a hazard-disabling puzzle immediately cancels lethal state", () => {
  const h = LEVELS[0].hazards[0],
    d = new HazardDirector();
  d.state(h).stage = "active";
  d.update(h, 0.02, hazardCenter(h), true, true, true);
  assert.equal(d.phase(h), "safe");
  assert.equal(d.lethal(h, []), false);
});
test("death staging and displayed time match actual gameplay, including midnight", () => {
  assert.equal(deathStage(0.1), "impact");
  assert.equal(deathStage(0.4), "fading");
  assert.equal(deathStage(1.3), "soul");
  assert.equal(deathStage(2.1), "settle");
  assert.equal(deathStage(2.45), "dialog");
  assert.equal(gameTime("07:18", 24), "07:21");
  assert.equal(gameTime("23:59", 16), "00:01");
});

test("train contact follows its rendered carriage rather than killing across an empty track", () => {
  const h = LEVELS[6].hazards.find((h) => h.id === "train"),
    d = new HazardDirector(),
    state = d.state(h);
  state.stage = "active";
  assert.equal(hazardContact(h, state, hazardCenter(h)), false);
  state.age = hazardProfile(h).active / 2;
  assert.equal(hazardContact(h, state, hazardCenter(h)), true);
  state.age = hazardProfile(h).active;
  assert.equal(hazardContact(h, state, hazardCenter(h)), false);
});
