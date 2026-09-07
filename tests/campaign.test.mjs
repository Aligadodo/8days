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
  // Runtime danger is now scene-local, not elapsedSeconds modulo a global period.
  const hazard = game.level.hazards[0];
  game.hazards.state(hazard).stage = "active";
  for (let tick = 0; tick < 60 && !game.waiting; tick++) game.update(0.02);
  assert.equal(game.waiting, true);
  assert.ok(game.player.x < 740);
  assert.equal(game.dead, false);
  assert.ok(game.destination);
  game.hazards.state(hazard).stage = "spent";
  game.update(0.02);
  for (let tick = 0; tick < 30; tick++) game.update(0.02);
  assert.equal(game.waiting, false);
  game.cancel();
  assert.equal(game.path.length, 0);
  assert.equal(game.destination, null);
  game.destroy();
});

test("sign gives a full warning, falls, then soul precedes the death dialog exactly once", () => {
  let dialog = 0,
    cinematic = false;
  const cues = [];
  const game = new CampaignGame(new Canvas(), {
    ...hooks,
    onDeath: () => dialog++,
    onCinematic: (value) => (cinematic = value),
    onAudio: (cue) => cues.push(cue.id),
  });
  game.previewSignAccident();
  const sign = game.level.hazards.find((h) => h.id === "falling-sign");
  game.level = { ...game.level, hazards: [sign] };
  game.elapsedSeconds = 3.1;
  game.update(0.02);
  assert.equal(game.hazards.state(sign).stage, "warning");
  for (let i = 0; i < 74; i++) game.update(0.02);
  assert.equal(game.dead, false);
  assert.equal(game.hazards.state(sign).stage, "warning");
  game.update(0.02);
  assert.equal(game.hazards.state(sign).stage, "release");
  for (let i = 0; i < 20; i++) game.update(0.02);
  assert.equal(game.dead, false, "still airborne at 0.40 seconds");
  game.update(0.02);
  assert.equal(game.dead, true);
  assert.equal(cinematic, true);
  assert.equal(dialog, 0);
  assert.equal(game.getView().deaths, 1);
  game.setPaused(false);
  game.restartAfterDeath();
  assert.equal(
    game.dead,
    true,
    "cannot skip the scene by resuming or early retry",
  );
  for (let i = 0; i < 90; i++) game.updateDeath(0.02);
  assert.equal(dialog, 0);
  assert.ok(cues.includes("player.soul.rise"));
  for (let i = 0; i < 35; i++) game.updateDeath(0.02);
  assert.equal(dialog, 1);
  game.updateDeath(5);
  game.updateHazards(0.02);
  assert.equal(dialog, 1);
  assert.equal(game.getView().deaths, 1);
  assert.ok(
    cues.indexOf("hazard.sign.creak") < cues.indexOf("hazard.object.release"),
  );
  assert.ok(
    cues.indexOf("hazard.object.release") < cues.indexOf("hazard.impact.wood"),
  );
  assert.ok(
    cues.indexOf("hazard.impact.wood") < cues.indexOf("player.soul.rise"),
  );
  game.restartAfterDeath();
  assert.equal(cinematic, false);
  assert.equal(game.dead, false);
  assert.equal(game.hazards.state(sign).stage, "dormant");
  assert.deepEqual(game.player, game.checkpoint);
  game.destroy();
});

test("player can click directly out of sign's footprint during warning and keep playing", () => {
  let dialog = 0;
  const toasts = [];
  const game = new CampaignGame(new Canvas(), {
    ...hooks,
    onDeath: () => dialog++,
    onToast: (value) => toasts.push(value),
  });
  game.previewSignAccident();
  game.level = {
    ...game.level,
    hazards: game.level.hazards.filter((h) => h.id === "falling-sign"),
  };
  game.elapsedSeconds = 3.1;
  game.update(0.02);
  game.navigate({ x: 1010, y: 355 }, null, false);
  for (let i = 0; i < 250; i++) game.update(0.02);
  assert.equal(game.dead, false);
  assert.equal(dialog, 0);
  assert.ok(game.player.x > 1005);
  assert.ok(toasts.some((t) => t.includes("及时离开")));
  assert.equal(game.hazards.state(game.level.hazards[0]).stage, "spent");
  game.navigate({ x: 870, y: 340 }, null, false);
  for (let i = 0; i < 350; i++) game.update(0.02);
  assert.equal(
    game.dead,
    false,
    "no invisible damage remains on the fallen sign",
  );
  game.destroy();
});

test("menus and background tabs freeze warning and soul timelines", () => {
  const game = new CampaignGame(new Canvas(), hooks);
  game.previewSignAccident();
  game.elapsedSeconds = 4;
  game.update(0.02);
  const sign = game.level.hazards.find((h) => h.id === "falling-sign");
  const age = game.hazards.state(sign).age;
  game.setPaused(true);
  game.update(20);
  assert.equal(game.hazards.state(sign).age, age);
  game.setPaused(false);
  document.hidden = true;
  game.update(20);
  assert.equal(game.hazards.state(sign).age, age);
  document.hidden = false;
  game.beginDeath(sign);
  document.hidden = true;
  game.updateDeath(20);
  assert.equal(game.deathScene.age, 0);
  document.hidden = false;
  game.updateDeath(0.4);
  assert.equal(game.deathScene.age, 0.4);
  game.destroy();
});
