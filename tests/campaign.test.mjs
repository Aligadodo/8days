import test from "node:test";
import assert from "node:assert/strict";
import { loadSource } from "./load-source.mjs";
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
class Canvas extends EventTarget {
  width = 960;
  height = 540;
  style = {};
  dataset = {};
  getContext() {
    return {};
  }
  getBoundingClientRect() {
    return { x: 0, y: 0, left: 0, top: 0, width: 960, height: 540 };
  }
}
globalThis.window = new EventTarget();
window.devicePixelRatio = 1;
globalThis.document = new EventTarget();
document.hidden = false;
document.getElementById = () => new Canvas();
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.Image = class {
  decode() {
    return new Promise(() => {});
  }
};
globalThis.requestAnimationFrame = () => 0;
const { CampaignGame } = loadSource("src/campaign/CampaignGame.ts");
const { LEVELS } = loadSource("src/campaign/levels.ts");
const hooks = {
  onView: () => {},
  onToast: () => {},
  onPuzzle: () => {},
  onFinal: () => {},
  onDeath: () => {},
  onComplete: () => {},
  onAudio: () => {},
};

test("campaign menu cannot overwrite saved progress before a run starts", () => {
  const original = JSON.stringify({
    version: 2,
    unlocked: 2,
    completed: [],
    stamps: [],
    levels: {
      "rain-commute": {
        solved: ["drain-order"],
        sideTasks: [],
        hintsUsed: 0,
        deaths: 0,
      },
    },
  });
  storage.set("one-more-day:campaign:v2", original);
  const game = new CampaignGame(new Canvas(), hooks);
  game.saveNow();
  assert.equal(storage.get("one-more-day:campaign:v2"), original);
  game.destroy();
});
test("movement, approach, puzzle dependency, checkpoint, final code and unlock across eight days", () => {
  storage.clear();
  let opened = null,
    final = null;
  const game = new CampaignGame(new Canvas(), {
    ...hooks,
    onPuzzle: (q) => (opened = q.id),
    onFinal: (q) => (final = q.id),
  });
  for (let index = 0; index < 8; index++) {
    game.startLevel(index, true);
    game.level = { ...game.getLevel(), hazards: [] };
    const level = game.getLevel();
    // Isolate navigation and interaction from periodic hazard timing in this integration test.
    for (const puzzle of level.puzzles) {
      const entity = game.entities.find((e) => e.id === puzzle.id);
      opened = null;
      game.navigate(entity, entity, false);
      for (let tick = 0; tick < 2000 && opened === null; tick++)
        game.update(0.02);
      assert.equal(
        opened,
        puzzle.id,
        `DAY ${index + 1}: approach must open ${puzzle.id}`,
      );
      game.solvePuzzle(puzzle.id);
      game.setPaused(false);
    }
    assert.equal(game.getView().solved.length, 4);
    assert.equal(game.submitFinal("xxxx"), false);
    final = null;
    const exit = game.entities.find((e) => e.id === "exit");
    game.navigate(exit, exit, false);
    for (let tick = 0; tick < 2000 && final === null; tick++) game.update(0.02);
    assert.equal(final, level.id);
    assert.equal(game.submitFinal(level.code), true);
    assert.equal(game.getSave().unlocked, Math.min(8, index + 2));
  }
  assert.equal(game.getSave().stamps.join(""), "好好生活明天再见");
  game.destroy();
});
test("direction stays stable during diagonal travel; keyboard repeats cannot reset it", () => {
  const game = new CampaignGame(new Canvas(), hooks);
  game.startLevel(0, true);
  game.facing = "right";
  for (let i = 0; i < 40; i++) {
    game.face(1, i % 2 ? 0.99 : 1.01);
    assert.equal(game.facing, "right");
  }
  game.face(-2, 0.1);
  assert.equal(game.facing, "left");
  game.face(0.02, -2);
  assert.equal(game.facing, "up");
  game.face(0, 0);
  assert.equal(game.facing, "up");
  game.destroy();
});
test("waterfall crossing appears in navigation only after its environmental puzzle", () => {
  const game = new CampaignGame(new Canvas(), hooks);
  game.startLevel(3, true);
  const far = { x: 1240, y: 650 };
  assert.equal(game.nav.route(game.player, far).length, 0);
  game.solvePuzzle("valves");
  game.solvePuzzle("lily-path");
  assert.ok(game.nav.route(game.player, far).length > 0);
  game.destroy();
});
test("hints do not double-charge, explored fog and checkpoint survive reload and death", () => {
  storage.clear();
  const game = new CampaignGame(new Canvas(), hooks);
  game.startLevel(0, true);
  game.player = { x: 600, y: 440 };
  game.reveal();
  game.solvePuzzle("drain-order");
  game.registerHint("bus-route", 1);
  game.registerHint("bus-route", 1);
  assert.equal(game.getView().hintsUsed, 1);
  game.restartAfterDeath();
  assert.deepEqual(game.player, { x: 600, y: 440 });
  const reloaded = new CampaignGame(new Canvas(), hooks);
  reloaded.startLevel(0);
  assert.deepEqual(reloaded.player, { x: 600, y: 440 });
  assert.equal(reloaded.hintStage("bus-route"), 1);
  assert.equal(reloaded.explored.size, game.explored.size);
  reloaded.resetCampaignSave();
  reloaded.saveNow();
  assert.equal(storage.get("one-more-day:campaign:v2"), undefined);
  game.destroy();
  reloaded.destroy();
});
test("active danger stops a running route and resumes the same destination", () => {
  const game = new CampaignGame(new Canvas(), hooks);
  game.startLevel(0, true);
  game.player = { x: 700, y: 450 };
  game.level = {
    ...game.getLevel(),
    hazards: [
      {
        id: "test",
        title: "落石",
        rect: { x: 740, y: 410, width: 100, height: 80 },
        period: 100,
        warningFrom: 1,
        activeFrom: 2,
        warning: "碎石",
        lesson: "等待",
        color: "#ffc080",
      },
    ],
  };
  game.elapsedSeconds = 0;
  game.navigate({ x: 900, y: 450 }, null, false);
  game.elapsedSeconds = 3;
  for (let tick = 0; tick < 60 && !game.waiting; tick++) game.update(0.02);
  assert.equal(game.waiting, true);
  assert.ok(game.player.x < 740);
  assert.equal(game.dead, false);
  assert.ok(game.destination);
  game.elapsedSeconds = 100;
  game.update(0.02);
  for (let tick = 0; tick < 30; tick++) game.update(0.02);
  assert.equal(game.waiting, false);
  game.cancel();
  assert.equal(game.path.length, 0);
  assert.equal(game.destination, null);
  game.destroy();
});
