import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./load-source.mjs";
const { Navigation, rectangle, p, inHazard, distance } = loadSource(
  "src/campaign/navigation.ts",
);
const { WORLDS } = loadSource("src/campaign/worldDesign.ts");
const { LEVELS, CAMPAIGN_PHRASE } = loadSource("src/campaign/levels.ts");
const { ENTITY_ART, entitiesFor } = loadSource("src/campaign/entities.ts");
const { shuffledOptions } = loadSource("src/campaign/puzzleLogic.ts");
const floor = [{ name: "test", polygon: rectangle(0, 0, 1600, 900) }];
test("clear diagonal uses one exact endpoint", () => {
  const nav = new Navigation(floor),
    end = p(805, 563);
  assert.deepEqual(nav.route(p(99, 90), end), [end]);
});
test("obstacle detour has collision-safe smoothed segments", () => {
  const nav = new Navigation(floor, [rectangle(350, 200, 160, 260)]),
    start = p(200, 320),
    route = nav.route(start, p(650, 320));
  assert.ok(route.length > 1);
  route.forEach((q, i) => assert.ok(nav.visible(i ? route[i - 1] : start, q)));
  assert.ok(route.every((q) => nav.isWalkable(q)));
});
test("blocked end snaps safely; distant roof cannot be destination", () => {
  const nav = new Navigation(floor, [rectangle(350, 200, 400, 400)]);
  assert.equal(nav.route(p(200, 250), p(550, 400)).length, 0);
  const route = nav.route(p(200, 250), p(370, 250));
  assert.ok(route.length);
  assert.ok(nav.isWalkable(route.at(-1)));
});
test("diagonal cannot cut touching corners", () => {
  const nav = new Navigation([
    { name: "L", polygon: rectangle(50, 50, 80, 80) },
    { name: "R", polygon: rectangle(130, 130, 80, 80) },
  ]);
  assert.equal(nav.route(p(80, 80), p(175, 175)).length, 0);
});
test("dynamic ellipse uses same shape on route samples", () => {
  const nav = new Navigation(floor),
    hazard = { x: 300, y: 200, width: 150, height: 100 },
    start = p(200, 250),
    blocked = (q) => inHazard(q, hazard, 9),
    route = nav.route(start, p(600, 250), blocked);
  assert.ok(route.length > 1);
  route.forEach((q, i) =>
    assert.ok(nav.visible(i ? route[i - 1] : start, q, blocked)),
  );
  assert.equal(inHazard(p(300, 200), hazard), false);
  assert.equal(inHazard(p(375, 250), hazard), true);
});
for (const [index, world] of WORLDS.entries())
  test(`DAY ${index + 1}: seven interactions reachable and separate`, () => {
    const nav = new Navigation(world.regions, world.blockers),
      level = LEVELS[index];
    assert.ok(nav.isWalkable(world.spawn), "spawn must be walkable");
    const entities = entitiesFor(level);
    assert.equal(entities.length, 7);
    for (const entity of entities) {
      const route = nav.route(
        world.spawn,
        p(entity.x, entity.y + 23),
        () => false,
        110,
      );
      assert.ok(route.length, `${entity.id} cannot be reached`);
      assert.ok(
        distance(route.at(-1), entity) < 115,
        `${entity.id} too far to interact`,
      );
      route.forEach((q, i) =>
        assert.ok(
          nav.visible(i ? route[i - 1] : world.spawn, q),
          `${entity.id} crosses collision`,
        ),
      );
    }
    for (let a = 0; a < entities.length; a++)
      for (let b = a + 1; b < entities.length; b++)
        assert.ok(
          distance(entities[a], entities[b]) > 34,
          `${entities[a].id} overlaps ${entities[b].id}`,
        );
  });
test("all interactions have sprites; sequence order does not reveal solution", () => {
  LEVELS.forEach((level) =>
    [...level.puzzles, ...level.sideTasks].forEach((q) =>
      assert.ok(ENTITY_ART[q.id], q.id),
    ),
  );
  LEVELS.flatMap((l) => l.puzzles).forEach((q) => {
    assert.deepEqual(shuffledOptions(q), shuffledOptions(q));
    assert.deepEqual([...shuffledOptions(q)].sort(), [...q.options].sort());
    if (q.kind === "sequence")
      assert.notDeepEqual(shuffledOptions(q), q.solution);
  });
});
test("day identity preserves repeated stamp characters", () => {
  const completed = LEVELS.map((l) => l.id);
  assert.equal(
    LEVELS.filter((l) => completed.includes(l.id))
      .map((l) => l.stamp)
      .join(""),
    CAMPAIGN_PHRASE.replace("，", ""),
  );
});
