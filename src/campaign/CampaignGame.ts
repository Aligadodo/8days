import { getLevel, LEVELS } from "./levels";
import type {
  CampaignHooks,
  CampaignSave,
  CampaignView,
  HazardSpec,
  LevelDefinition,
  PersistedLevelState,
  Point,
  PuzzleSpec,
  Rect,
  SideTaskSpec,
} from "./types";

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 900;
const GRID = 32;
const SAVE_KEY = "one-more-day:campaign:v2";

interface Player extends Point {
  radius: number;
  facing: 1 | -1;
}

type FocusTarget = { type: "puzzle" | "side" | "exit"; id: string };

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const point = (x: number, y: number): Point => ({ x, y });
const inside = (point: Point, area: Rect, padding = 0) =>
  point.x >= area.x - padding && point.x <= area.x + area.width + padding && point.y >= area.y - padding && point.y <= area.y + area.height + padding;
const distanceToSegment = (candidate: Point, start: Point, end: Point) => {
  const dx = end.x - start.x; const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(candidate, start);
  const t = clamp(((candidate.x - start.x) * dx + (candidate.y - start.y) * dy) / lengthSquared, 0, 1);
  return distance(candidate, point(start.x + dx * t, start.y + dy * t));
};

export class CampaignGame {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly hooks: CampaignHooks;
  private levelIndex = 0;
  private level: LevelDefinition = LEVELS[0];
  private player: Player = { ...LEVELS[0].playerStart, radius: 14, facing: 1 };
  private camera = { x: 0, y: 0 };
  private path: Point[] = [];
  private focus: FocusTarget | null = null;
  private hovered: FocusTarget | null = null;
  private solved = new Set<string>();
  private sideTasks = new Set<string>();
  private inventory: string[] = [];
  private paused = true;
  private running = false;
  private dead = false;
  private completed = false;
  private elapsedSeconds = 0;
  private hintCount = 0;
  private deathCount = 0;
  private lastFrame = performance.now();
  private lastFootstep = 0;
  private lastViewSecond = -1;
  private warnedCycles = new Map<string, number>();
  private save: CampaignSave;
  private dangerAssist = false;
  private reducedMotion = false;
  private pointerDown = false;
  private lastPointerRouteAt = 0;
  private readonly mapImages = new Map<string, HTMLImageElement>();
  private heroSprite: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement, hooks: CampaignHooks) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");
    this.ctx = context;
    this.hooks = hooks;
    this.save = this.loadSave();
    this.preloadAssets();
    this.resize();
    this.bindInput();
    window.addEventListener("resize", () => this.resize());
    this.running = true;
    requestAnimationFrame((time) => this.frame(time));
  }

  getSave() {
    return structuredClone(this.save);
  }

  getLevel() {
    return this.level;
  }

  getView(): CampaignView {
    const currentPuzzle = this.getCurrentPuzzle();
    const objective = currentPuzzle
      ? `${currentPuzzle.icon} ${currentPuzzle.title}：${currentPuzzle.prompt}`
      : this.solved.size === this.level.puzzles.length
        ? `前往${this.level.landmarks.at(-1)?.title ?? "终点"}，按符号顺序重组口令`
        : this.level.goal;
    return {
      levelIndex: this.levelIndex,
      level: this.level,
      solved: [...this.solved],
      sideTasks: [...this.sideTasks],
      inventory: [...this.inventory],
      currentPuzzle,
      objective,
      completed: this.completed,
      deaths: this.deathCount,
      hintsUsed: this.hintCount,
      elapsedSeconds: this.elapsedSeconds,
    };
  }

  startLevel(index: number, resetRun = false) {
    this.levelIndex = clamp(Math.floor(index), 0, LEVELS.length - 1);
    this.level = getLevel(this.levelIndex);
    const persisted = this.save.levels[this.level.id];
    this.solved = new Set(resetRun ? [] : persisted?.solved ?? []);
    this.sideTasks = new Set(resetRun ? [] : persisted?.sideTasks ?? []);
    this.inventory = this.level.puzzles.filter((puzzle) => this.solved.has(puzzle.id)).map((puzzle) => puzzle.rewardItem);
    this.hintCount = resetRun ? 0 : persisted?.hintsUsed ?? 0;
    this.deathCount = resetRun ? 0 : persisted?.deaths ?? 0;
    this.elapsedSeconds = 0;
    this.lastViewSecond = -1;
    this.completed = false;
    this.dead = false;
    this.paused = false;
    this.path = [];
    this.focus = null;
    this.player = { ...this.level.playerStart, radius: 14, facing: 1 };
    this.camera.x = clamp(this.player.x - VIEW_WIDTH / 2, 0, WORLD_WIDTH - VIEW_WIDTH);
    this.camera.y = clamp(this.player.y - VIEW_HEIGHT / 2, 0, WORLD_HEIGHT - VIEW_HEIGHT);
    this.warnedCycles.clear();
    this.persistLevel();
    this.emitView();
    this.hooks.onToast(`DAY ${String(this.level.day).padStart(2, "0")} · ${this.level.name}`, "success");
    this.hooks.onAudio({ id: "music.spring.intro", caption: `${this.level.name}开始` });
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.path = paused ? [] : this.path;
  }

  setDangerAssist(enabled: boolean) {
    this.dangerAssist = enabled;
  }

  setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
  }

  solvePuzzle(id: string) {
    const puzzle = this.level.puzzles.find((candidate) => candidate.id === id);
    if (!puzzle || this.solved.has(id) || !this.isPuzzleAvailable(puzzle)) return;
    this.solved.add(id);
    this.inventory.push(puzzle.rewardItem);
    this.focus = null;
    this.path = [];
    this.persistLevel();
    this.hooks.onAudio({ id: "puzzle.solve", caption: `谜题解开：${puzzle.title}` });
    this.hooks.onToast(puzzle.solvedText, "success");
    this.emitView();
  }

  registerHint() {
    this.hintCount += 1;
    this.persistLevel();
    this.emitView();
  }

  submitFinal(code: string) {
    if (this.solved.size !== this.level.puzzles.length) return false;
    if (code !== this.level.code) {
      this.hooks.onAudio({ id: "puzzle.reset", caption: "口令顺序不对" });
      return false;
    }
    this.completed = true;
    this.paused = true;
    if (!this.save.completed.includes(this.level.id)) this.save.completed.push(this.level.id);
    if (!this.save.stamps.includes(this.level.stamp)) this.save.stamps.push(this.level.stamp);
    this.save.unlocked = Math.max(this.save.unlocked, Math.min(LEVELS.length, this.levelIndex + 2));
    this.persistLevel();
    this.hooks.onAudio({ id: "achievement.unlock", caption: `获得日记印章：${this.level.stamp}` });
    this.emitView();
    this.hooks.onComplete(this.level, this.getView());
    return true;
  }

  restartAfterDeath() {
    this.dead = false;
    this.paused = false;
    this.path = [];
    this.focus = null;
    this.player = { ...this.level.playerStart, radius: 14, facing: 1 };
    this.camera.x = clamp(this.player.x - VIEW_WIDTH / 2, 0, WORLD_WIDTH - VIEW_WIDTH);
    this.camera.y = clamp(this.player.y - VIEW_HEIGHT / 2, 0, WORLD_HEIGHT - VIEW_HEIGHT);
    this.emitView();
  }

  saveNow() {
    this.persistLevel();
    return new Date();
  }

  resetCampaignSave() {
    this.save = { version: 2, unlocked: 1, completed: [], stamps: [], levels: {} };
    this.solved.clear();
    this.sideTasks.clear();
    this.inventory = [];
    this.hintCount = 0;
    this.deathCount = 0;
    this.completed = false;
    localStorage.removeItem(SAVE_KEY);
  }

  destroy() {
    this.running = false;
  }

  private preloadAssets() {
    for (const level of LEVELS) {
      if (this.mapImages.has(level.background)) continue;
      const image = new Image();
      image.decoding = "async";
      image.src = level.background;
      this.mapImages.set(level.background, image);
    }

    const hero = new Image();
    hero.decoding = "async";
    hero.onload = () => {
      const keyed = document.createElement("canvas");
      keyed.width = hero.naturalWidth;
      keyed.height = hero.naturalHeight;
      const keyedContext = keyed.getContext("2d", { willReadFrequently: true });
      if (!keyedContext) return;
      keyedContext.drawImage(hero, 0, 0);
      const pixels = keyedContext.getImageData(0, 0, keyed.width, keyed.height);
      let minX = keyed.width; let minY = keyed.height; let maxX = 0; let maxY = 0;
      for (let y = 0; y < keyed.height; y += 1) {
        for (let x = 0; x < keyed.width; x += 1) {
          const index = (y * keyed.width + x) * 4;
          const red = pixels.data[index]; const green = pixels.data[index + 1]; const blue = pixels.data[index + 2];
          const magenta = red > 145 && blue > 145 && red - green > 58 && blue - green > 58;
          if (magenta) pixels.data[index + 3] = 0;
          else if (pixels.data[index + 3] > 0) { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); }
        }
      }
      keyedContext.putImageData(pixels, 0, 0);
      if (maxX <= minX || maxY <= minY) return;
      const trimmed = document.createElement("canvas");
      trimmed.width = maxX - minX + 1;
      trimmed.height = maxY - minY + 1;
      trimmed.getContext("2d")?.drawImage(keyed, minX, minY, trimmed.width, trimmed.height, 0, 0, trimmed.width, trimmed.height);
      this.heroSprite = trimmed;
    };
    hero.src = "/assets/hero-chibi.png";
  }

  private bindInput() {
    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button === 2) {
        this.cancelPath();
        return;
      }
      this.pointerDown = true;
      this.lastPointerRouteAt = event.timeStamp;
      this.canvas.setPointerCapture(event.pointerId);
      this.handlePointer(event, true);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      const world = this.eventToWorld(event);
      this.hovered = this.findTarget(world, 45);
      this.canvas.style.cursor = this.hovered ? "pointer" : "crosshair";
      if (this.pointerDown && !this.hovered && !this.paused && event.timeStamp - this.lastPointerRouteAt >= 120) {
        this.lastPointerRouteAt = event.timeStamp;
        this.handlePointer(event, false);
      }
    });
    this.canvas.addEventListener("pointerup", (event) => {
      this.pointerDown = false;
      if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointercancel", () => { this.pointerDown = false; });
    this.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.cancelPath();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.cancelPath();
      if (this.paused || this.dead) return;
      if (event.key.toLowerCase() === "e") {
        const nearby = this.findTarget(this.player, 74);
        if (nearby) this.interact(nearby);
        else this.hooks.onToast("附近没有可调查的物件。带光边的目标可以点击。", "danger");
        return;
      }
      const keyVectors: Record<string, Point> = {
        w: point(0, -1), a: point(-1, 0), s: point(0, 1), d: point(1, 0),
        ArrowUp: point(0, -1), ArrowLeft: point(-1, 0), ArrowDown: point(0, 1), ArrowRight: point(1, 0),
      };
      const vector = keyVectors[event.key];
      if (!vector) return;
      const target = point(this.player.x + vector.x * 80, this.player.y + vector.y * 80);
      this.setDestination(target, null);
    });
  }

  private handlePointer(event: PointerEvent, allowInteraction: boolean) {
    if (this.paused || this.dead) return;
    const world = this.eventToWorld(event);
    const target = allowInteraction ? this.findTarget(world, 48) : null;
    if (target) {
      const position = this.targetPosition(target);
      this.setDestination(position, target);
      return;
    }
    this.setDestination(world, null);
  }

  private cancelPath() {
    this.path = [];
    this.focus = null;
    this.hooks.onAudio({ id: "ui.click.soft" });
  }

  private setDestination(target: Point, focus: FocusTarget | null) {
    const bounded = point(clamp(target.x, 75, WORLD_WIDTH - 75), clamp(target.y, 75, WORLD_HEIGHT - 75));
    const route = this.findPath(this.player, bounded);
    if (route.length === 0) {
      this.hooks.onToast("那里暂时走不过去，换一侧试试。", "danger");
      this.hooks.onAudio({ id: "nav.route.blocked", caption: "路线被挡住" });
      return;
    }
    this.path = route;
    this.focus = focus;
    this.hooks.onAudio({ id: "nav.route.accept" });
  }

  private eventToWorld(event: PointerEvent): Point {
    const bounds = this.canvas.getBoundingClientRect();
    return point(
      this.camera.x + ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH,
      this.camera.y + ((event.clientY - bounds.top) / bounds.height) * VIEW_HEIGHT,
    );
  }

  private findTarget(world: Point, radius: number): FocusTarget | null {
    const puzzle = this.level.puzzles.find((candidate) => distance(world, candidate.position) <= radius);
    if (puzzle) return { type: "puzzle", id: puzzle.id };
    const side = this.level.sideTasks.find((candidate) => distance(world, candidate.position) <= radius);
    if (side) return { type: "side", id: side.id };
    if (distance(world, this.level.exit) <= radius + 10) return { type: "exit", id: "exit" };
    return null;
  }

  private targetPosition(target: FocusTarget) {
    if (target.type === "exit") return this.level.exit;
    if (target.type === "puzzle") return this.level.puzzles.find((puzzle) => puzzle.id === target.id)?.position ?? this.player;
    return this.level.sideTasks.find((side) => side.id === target.id)?.position ?? this.player;
  }

  private interact(target: FocusTarget) {
    if (target.type === "exit") {
      if (this.solved.size < this.level.puzzles.length) {
        const missing = this.level.puzzles.length - this.solved.size;
        this.hooks.onToast(`终点还缺 ${missing} 段记忆。跟随金色光标继续调查。`, "danger");
        this.hooks.onAudio({ id: "interaction.blocked", caption: "终点还没有准备好" });
        return;
      }
      this.paused = true;
      this.hooks.onFinal(this.level);
      return;
    }
    if (target.type === "puzzle") {
      const puzzle = this.level.puzzles.find((candidate) => candidate.id === target.id);
      if (!puzzle) return;
      if (this.solved.has(puzzle.id)) {
        this.hooks.onToast(`${puzzle.symbol}＝${puzzle.rewardDigit} · ${puzzle.rewardItem}`, "success");
        return;
      }
      if (!this.isPuzzleAvailable(puzzle)) {
        const required = puzzle.requires?.map((id) => this.level.puzzles.find((candidate) => candidate.id === id)?.title).filter(Boolean).join("、");
        this.hooks.onToast(`这处线索还读不懂。先完成：${required}`, "danger");
        this.hooks.onAudio({ id: "interaction.blocked" });
        return;
      }
      this.paused = true;
      this.hooks.onPuzzle(puzzle);
      return;
    }
    const side = this.level.sideTasks.find((candidate) => candidate.id === target.id);
    if (!side) return;
    if (this.sideTasks.has(side.id)) {
      this.hooks.onToast(`${side.title}已经完成。`);
      return;
    }
    this.completeSideTask(side);
  }

  private completeSideTask(side: SideTaskSpec) {
    this.sideTasks.add(side.id);
    this.persistLevel();
    this.hooks.onAudio({ id: "task.complete", caption: `小事完成：${side.title}` });
    this.hooks.onToast(side.completeText, "success");
    this.emitView();
  }

  private getCurrentPuzzle() {
    return this.level.puzzles.find((puzzle) => !this.solved.has(puzzle.id) && this.isPuzzleAvailable(puzzle)) ?? null;
  }

  private isPuzzleAvailable(puzzle: PuzzleSpec) {
    return (puzzle.requires ?? []).every((id) => this.solved.has(id));
  }

  private frame(time: number) {
    if (!this.running) return;
    const delta = Math.min(0.05, (time - this.lastFrame) / 1000);
    this.lastFrame = time;
    if (!this.paused && !this.dead) this.update(delta);
    this.draw(time / 1000);
    requestAnimationFrame((next) => this.frame(next));
  }

  private update(delta: number) {
    this.elapsedSeconds += delta;
    if (this.path.length > 0) {
      const next = this.path[0];
      if (this.level.hazards.some((hazard) => !this.isHazardDisabled(hazard) && this.hazardPhase(hazard) === "active" && inside(next, hazard.rect, 8))) {
        this.path = [];
        this.focus = null;
        this.hooks.onToast("前方危险正在发生，路线已暂停；等征兆消退或从侧面绕行。", "danger");
        this.hooks.onAudio({ id: "nav.route.blocked", caption: "前方危险，路线暂停" });
      }
    }
    if (this.path.length > 0) {
      const next = this.path[0];
      const dx = next.x - this.player.x;
      const dy = next.y - this.player.y;
      const remaining = Math.hypot(dx, dy);
      const step = 175 * delta;
      if (Math.abs(dx) > 0.5) this.player.facing = dx > 0 ? 1 : -1;
      if (remaining <= step) {
        this.player.x = next.x;
        this.player.y = next.y;
        this.path.shift();
      } else {
        this.player.x += (dx / remaining) * step;
        this.player.y += (dy / remaining) * step;
      }
      if (this.elapsedSeconds - this.lastFootstep > 0.28) {
        this.lastFootstep = this.elapsedSeconds;
        this.hooks.onAudio({ id: this.level.environment === "night-office" ? "footstep.stone" : "footstep.grass" });
      }
      if (this.path.length === 0 && this.focus) {
        const target = this.focus;
        this.focus = null;
        if (distance(this.player, this.targetPosition(target)) <= 66) this.interact(target);
      }
    }
    const desiredX = clamp(this.player.x - VIEW_WIDTH / 2, 0, WORLD_WIDTH - VIEW_WIDTH);
    const desiredY = clamp(this.player.y - VIEW_HEIGHT / 2, 0, WORLD_HEIGHT - VIEW_HEIGHT);
    const follow = this.reducedMotion ? 1 : 0.09;
    this.camera.x += (desiredX - this.camera.x) * follow;
    this.camera.y += (desiredY - this.camera.y) * follow;
    this.updateHazards();
    const viewSecond = Math.floor(this.elapsedSeconds);
    if (viewSecond !== this.lastViewSecond) {
      this.lastViewSecond = viewSecond;
      this.emitView();
    }
  }

  private updateHazards() {
    for (const hazard of this.level.hazards) {
      if (this.isHazardDisabled(hazard)) continue;
      const cycle = Math.floor(this.elapsedSeconds / hazard.period);
      const phase = this.elapsedSeconds % hazard.period;
      if (phase >= hazard.warningFrom && phase < hazard.activeFrom && this.warnedCycles.get(hazard.id) !== cycle) {
        this.warnedCycles.set(hazard.id, cycle);
        const pan = clamp(((hazard.rect.x + hazard.rect.width / 2 - this.camera.x) / VIEW_WIDTH) * 2 - 1, -1, 1);
        this.hooks.onAudio({ id: "hazard.wind.warn", pan, caption: hazard.warning });
        if (distance(this.player, point(hazard.rect.x + hazard.rect.width / 2, hazard.rect.y + hazard.rect.height / 2)) < 250) {
          this.hooks.onToast(`危险征兆：${hazard.warning}`, "danger");
        }
      }
      if (phase >= hazard.activeFrom && inside(this.player, hazard.rect, -8)) {
        this.kill(hazard);
        return;
      }
    }
  }

  private kill(hazard: HazardSpec) {
    this.dead = true;
    this.paused = true;
    this.path = [];
    this.deathCount += 1;
    this.persistLevel();
    this.hooks.onAudio({ id: "player.death.soft", caption: hazard.title });
    this.hooks.onDeath({ cause: hazard.title, lesson: hazard.lesson, time: this.formattedTime() });
    this.emitView();
  }

  private formattedTime() {
    const [hour, minute] = this.level.startTime.split(":").map(Number);
    const total = hour * 60 + minute + Math.floor(this.elapsedSeconds / 8);
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  private draw(time: number) {
    const ctx = this.ctx;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.save();
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    this.drawWorld(ctx, time);
    ctx.restore();
    this.drawGuidance(ctx, time);
  }

  private drawWorld(ctx: CanvasRenderingContext2D, time: number) {
    const palette = this.level.palette;
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const background = this.mapImages.get(this.level.background);
    if (background?.complete && background.naturalWidth > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(background, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      ctx.imageSmoothingEnabled = false;
      this.drawAtmosphere(ctx, time);
    } else {
      this.drawGroundPattern(ctx);
      this.drawEnvironmentFeatures(ctx, time);
      this.drawRoute(ctx);
      this.level.blockers.forEach((blocker, index) => this.drawBlocker(ctx, blocker, index));
      this.level.landmarks.forEach((landmark) => this.drawLandmark(ctx, landmark.position, landmark.icon, landmark.title, landmark.size ?? 68));
    }
    this.level.hazards.filter((hazard) => !this.isHazardDisabled(hazard)).forEach((hazard) => this.drawHazard(ctx, hazard, time));
    this.drawResolvedAreas(ctx, time);
    this.level.sideTasks.forEach((side) => this.drawSideTask(ctx, side, time));
    this.level.puzzles.forEach((puzzle) => this.drawPuzzle(ctx, puzzle, time));
    this.drawExit(ctx, time);
    if (this.path.length > 0) this.drawBreadcrumbs(ctx, time);
    this.drawPlayer(ctx, time);
  }

  private drawGroundPattern(ctx: CanvasRenderingContext2D) {
    const palette = this.level.palette;
    ctx.fillStyle = palette.groundAlt;
    for (let y = 20; y < WORLD_HEIGHT; y += 48) {
      for (let x = (y / 48) % 2 ? 16 : 32; x < WORLD_WIDTH; x += 64) {
        const seed = (x * 13 + y * 7 + this.level.day * 31) % 17;
        if (seed < 7) ctx.fillRect(x, y, seed % 2 === 0 ? 5 : 8, seed % 3 === 0 ? 3 : 5);
      }
    }
  }

  private drawAtmosphere(ctx: CanvasRenderingContext2D, time: number) {
    const kind = this.level.environment;
    ctx.save();
    if (kind === "rain-city" || kind === "storm-mountain") {
      ctx.globalAlpha = kind === "storm-mountain" ? .38 : .26;
      ctx.strokeStyle = kind === "storm-mountain" ? "#d7e6ef" : "#d8f5ff";
      ctx.lineWidth = kind === "storm-mountain" ? 2.2 : 1.6;
      for (let x = -40; x < WORLD_WIDTH + 80; x += 48) {
        const fall = this.reducedMotion ? (x * 5) % WORLD_HEIGHT : (time * (kind === "storm-mountain" ? 190 : 125) + x * 4) % (WORLD_HEIGHT + 80) - 40;
        ctx.beginPath(); ctx.moveTo(x, fall); ctx.lineTo(x - 12, fall + 24); ctx.stroke();
      }
    } else if (kind === "snow-station") {
      ctx.globalAlpha = .75; ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 100; i += 1) {
        const x = (i * 137 + (this.reducedMotion ? 0 : time * (9 + i % 6))) % WORLD_WIDTH;
        const y = (i * 71 + (this.reducedMotion ? 0 : time * (18 + i % 9))) % WORLD_HEIGHT;
        const size = 2 + i % 3; ctx.fillRect(x, y, size, size);
      }
    } else {
      const colors = kind === "glow-cave" ? ["#65f5d0", "#ad86ff", "#fff09c"] : kind === "autumn-river" ? ["#f2a14d", "#dc6f45", "#ffe09a"] : ["#fff5a5", "#f5b5dc", "#b2f5e8"];
      ctx.globalAlpha = kind === "night-office" ? .18 : .52;
      for (let i = 0; i < (kind === "night-office" ? 12 : 34); i += 1) {
        const x = (i * 197 + (this.reducedMotion ? 0 : time * (3 + i % 4))) % WORLD_WIDTH;
        const y = (i * 113 + Math.sin(time + i) * (this.reducedMotion ? 0 : 8)) % WORLD_HEIGHT;
        ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(x, y, 3 + i % 3, 3 + i % 2);
      }
    }
    ctx.restore();
  }

  private drawResolvedAreas(ctx: CanvasRenderingContext2D, time: number) {
    for (const hazard of this.level.hazards) {
      if (!this.isHazardDisabled(hazard)) continue;
      const center = point(hazard.rect.x + hazard.rect.width / 2, hazard.rect.y + hazard.rect.height / 2);
      ctx.save(); ctx.globalAlpha = .55; ctx.fillStyle = "#b9ffe2";
      for (let i = 0; i < 7; i += 1) {
        const angle = i * .9 + (this.reducedMotion ? 0 : time * .18);
        const radius = 22 + i * 5;
        ctx.fillRect(center.x + Math.cos(angle) * radius - 2, center.y + Math.sin(angle) * radius * .45 - 2, 4, 4);
      }
      ctx.restore();
    }
  }

  private drawMarkerLabel(ctx: CanvasRenderingContext2D, position: Point, label: string, border: string) {
    ctx.save(); ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const width = Math.max(84, Math.min(180, ctx.measureText(label).width + 24));
    const x = position.x - width / 2; const y = position.y + 31;
    ctx.fillStyle = "#142432e8"; ctx.fillRect(x, y, width, 26);
    ctx.strokeStyle = border; ctx.lineWidth = 2; ctx.strokeRect(x, y, width, 26);
    ctx.fillStyle = "#fff9dc"; ctx.fillText(label, position.x, y + 13);
    ctx.restore();
  }

  private isHazardDisabled(hazard: HazardSpec) {
    return Boolean(hazard.disabledBy && this.solved.has(hazard.disabledBy));
  }

  private hazardPhase(hazard: HazardSpec): "safe" | "warning" | "active" {
    const phase = this.elapsedSeconds % hazard.period;
    if (phase >= hazard.activeFrom) return "active";
    if (phase >= hazard.warningFrom) return "warning";
    return "safe";
  }

  private drawRoute(ctx: CanvasRenderingContext2D) {
    const route = this.level.route;
    ctx.lineCap = "square";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.level.palette.pathEdge;
    ctx.lineWidth = 62;
    ctx.beginPath();
    ctx.moveTo(route[0].x, route[0].y);
    route.slice(1).forEach((part) => ctx.lineTo(part.x, part.y));
    ctx.stroke();
    ctx.strokeStyle = this.level.palette.path;
    ctx.lineWidth = 50;
    ctx.stroke();
    ctx.strokeStyle = `${this.level.palette.accentSoft}55`;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 20]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawEnvironmentFeatures(ctx: CanvasRenderingContext2D, time: number) {
    const kind = this.level.environment;
    const p = this.level.palette;
    if (kind === "rain-city") {
      ctx.fillStyle = p.water;
      ctx.fillRect(0, 500, 390, 80);
      ctx.fillRect(655, 150, 260, 70);
      ctx.strokeStyle = "#b9dce5";
      ctx.lineWidth = 2;
      for (let x = 0; x < WORLD_WIDTH; x += 42) {
        const fall = this.reducedMotion ? 0 : (time * 80 + x * 3) % 900;
        ctx.beginPath(); ctx.moveTo(x, fall); ctx.lineTo(x - 9, fall + 18); ctx.stroke();
      }
    } else if (kind === "night-office") {
      ctx.fillStyle = "#20263a";
      for (let x = 90; x < WORLD_WIDTH - 90; x += 160) for (let y = 80; y < WORLD_HEIGHT - 80; y += 120) ctx.fillRect(x, y, 110, 64);
      ctx.fillStyle = "#61718d";
      for (let x = 105; x < WORLD_WIDTH - 100; x += 160) ctx.fillRect(x, 95, 72, 8);
    } else if (kind === "flower-valley") {
      ctx.fillStyle = p.water;
      ctx.beginPath(); ctx.moveTo(0, 360); ctx.bezierCurveTo(380, 280, 540, 570, 820, 465); ctx.bezierCurveTo(1100, 360, 1280, 500, 1600, 390); ctx.lineTo(1600, 475); ctx.bezierCurveTo(1260, 565, 1080, 440, 820, 555); ctx.bezierCurveTo(520, 670, 330, 380, 0, 450); ctx.closePath(); ctx.fill();
      this.drawFlowers(ctx, 90);
    } else if (kind === "rainbow-falls") {
      ctx.fillStyle = p.water;
      ctx.fillRect(1000, 0, 230, 310);
      ctx.beginPath(); ctx.moveTo(1040, 260); ctx.bezierCurveTo(930, 420, 820, 520, 690, 900); ctx.lineTo(830, 900); ctx.bezierCurveTo(900, 590, 1100, 430, 1190, 270); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#d2fbff"; ctx.lineWidth = 7;
      for (let x = 1040; x < 1210; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x - 24, 300); ctx.stroke(); }
      this.drawFlowers(ctx, 48);
    } else if (kind === "autumn-river") {
      ctx.fillStyle = p.water;
      ctx.beginPath(); ctx.moveTo(0, 560); ctx.bezierCurveTo(360, 480, 600, 610, 840, 555); ctx.bezierCurveTo(1120, 495, 1350, 560, 1600, 500); ctx.lineTo(1600, 680); ctx.bezierCurveTo(1300, 735, 1100, 650, 830, 720); ctx.bezierCurveTo(540, 790, 330, 640, 0, 730); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#d5783f";
      for (let i = 0; i < 80; i += 1) { const x = (i * 149) % 1570; const y = (i * 83) % 860; ctx.fillRect(x, y, 8, 5); }
    } else if (kind === "storm-mountain") {
      ctx.fillStyle = p.groundAlt;
      for (let x = 0; x < WORLD_WIDTH; x += 220) { ctx.beginPath(); ctx.moveTo(x, 420); ctx.lineTo(x + 120, 130); ctx.lineTo(x + 260, 420); ctx.fill(); }
      ctx.fillStyle = p.water;
      ctx.beginPath(); ctx.moveTo(0, 720); ctx.lineTo(720, 540); ctx.lineTo(780, 620); ctx.lineTo(0, 850); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#b8cad6"; ctx.lineWidth = 2;
      for (let x = 0; x < WORLD_WIDTH; x += 55) { const fall = this.reducedMotion ? 0 : (time * 110 + x) % 900; ctx.beginPath(); ctx.moveTo(x, fall); ctx.lineTo(x - 13, fall + 24); ctx.stroke(); }
    } else if (kind === "snow-station") {
      ctx.fillStyle = "#6f8197";
      ctx.fillRect(0, 520, WORLD_WIDTH, 15);
      ctx.fillRect(0, 610, WORLD_WIDTH, 9);
      ctx.strokeStyle = "#42546b"; ctx.lineWidth = 5;
      for (let x = 0; x < WORLD_WIDTH; x += 44) { ctx.beginPath(); ctx.moveTo(x, 505); ctx.lineTo(x + 12, 630); ctx.stroke(); }
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 150; i += 1) { const x = (i * 97 + (this.reducedMotion ? 0 : time * 15)) % WORLD_WIDTH; const y = (i * 53 + (this.reducedMotion ? 0 : time * 28)) % WORLD_HEIGHT; ctx.fillRect(x, y, i % 3 + 2, i % 3 + 2); }
    } else {
      ctx.fillStyle = p.water;
      ctx.beginPath(); ctx.moveTo(0, 570); ctx.bezierCurveTo(330, 480, 620, 700, 900, 570); ctx.bezierCurveTo(1170, 440, 1330, 580, 1600, 470); ctx.lineTo(1600, 650); ctx.bezierCurveTo(1300, 750, 1100, 610, 880, 730); ctx.bezierCurveTo(600, 850, 330, 620, 0, 760); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 55; i += 1) {
        const x = (i * 173) % 1550 + 20; const y = (i * 107) % 850 + 20;
        ctx.fillStyle = i % 2 ? "#6cebd1" : "#a483ff";
        ctx.fillRect(x, y, 5, 12); ctx.fillRect(x - 3, y + 4, 11, 4);
      }
    }
  }

  private drawFlowers(ctx: CanvasRenderingContext2D, count: number) {
    const colors = ["#fff4a8", "#ff9fc8", "#fefefe", "#7d91ff"];
    for (let i = 0; i < count; i += 1) {
      const x = (i * 137 + this.level.day * 23) % 1540 + 30;
      const y = (i * 79 + this.level.day * 41) % 840 + 30;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x - 3, y, 3, 3); ctx.fillRect(x + 3, y, 3, 3); ctx.fillRect(x, y - 3, 3, 3); ctx.fillRect(x, y + 3, 3, 3);
      ctx.fillStyle = "#ffd75b"; ctx.fillRect(x, y, 3, 3);
    }
  }

  private drawBlocker(ctx: CanvasRenderingContext2D, blocker: Rect, index: number) {
    ctx.fillStyle = this.level.palette.shadow;
    ctx.fillRect(blocker.x, blocker.y + 8, blocker.width, blocker.height);
    ctx.fillStyle = index % 2 ? this.level.palette.groundAlt : this.level.palette.pathEdge;
    ctx.fillRect(blocker.x, blocker.y, blocker.width, blocker.height);
    ctx.fillStyle = `${this.level.palette.accentSoft}35`;
    ctx.fillRect(blocker.x + 8, blocker.y + 8, blocker.width - 16, 8);
  }

  private drawLandmark(ctx: CanvasRenderingContext2D, position: Point, icon: string, title: string, size: number) {
    ctx.fillStyle = this.level.palette.shadow;
    ctx.fillRect(position.x - size / 2 + 6, position.y - size / 2 + 9, size, size);
    ctx.fillStyle = this.level.palette.pathEdge;
    ctx.fillRect(position.x - size / 2, position.y - size / 2, size, size);
    ctx.fillStyle = this.level.palette.accentSoft;
    ctx.fillRect(position.x - size / 2 + 7, position.y - size / 2 + 7, size - 14, size - 14);
    ctx.fillStyle = this.level.palette.shadow;
    ctx.font = "bold 20px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(icon, position.x, position.y - 3);
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(title, position.x, position.y + size / 2 + 15);
  }

  private drawPuzzle(ctx: CanvasRenderingContext2D, puzzle: PuzzleSpec, time: number) {
    const solved = this.solved.has(puzzle.id);
    const available = this.isPuzzleAvailable(puzzle);
    const current = this.getCurrentPuzzle()?.id === puzzle.id;
    const hover = this.hovered?.type === "puzzle" && this.hovered.id === puzzle.id;
    const pulse = this.reducedMotion ? 0 : Math.sin(time * 4 + puzzle.position.x) * 3;
    const radius = solved ? 14 : 18;
    ctx.save();
    ctx.translate(puzzle.position.x, puzzle.position.y);
    if ((available && !solved) || hover) {
      ctx.shadowBlur = current ? 22 : 13;
      ctx.shadowColor = current ? this.level.palette.accent : "#c6fff2";
      ctx.strokeStyle = current ? "#fff0a3" : "#d5fff5";
      ctx.lineWidth = current ? 4 : 2;
      ctx.beginPath(); ctx.arc(0, 0, radius + 9 + pulse, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = solved ? "#4e9e7a" : available ? this.level.palette.accent : "#5b6670";
    ctx.strokeStyle = solved ? "#c9ffe6" : available ? "#fff3b1" : "#9da5aa";
    ctx.lineWidth = 3;
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    ctx.rotate(-Math.PI / 4);
    ctx.shadowBlur = 0;
    ctx.fillStyle = solved ? "#e1fff0" : available ? this.level.palette.shadow : "#d2d7da";
    ctx.font = `bold ${solved ? 15 : 17}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(solved ? "✓" : puzzle.icon, 0, 0);
    ctx.restore();
    if (current || hover) this.drawMarkerLabel(ctx, puzzle.position, solved ? `${puzzle.symbol}＝${puzzle.rewardDigit}` : puzzle.title, current ? "#d3a62e" : "#5f877e");
  }

  private drawSideTask(ctx: CanvasRenderingContext2D, side: SideTaskSpec, time: number) {
    const done = this.sideTasks.has(side.id);
    const hover = this.hovered?.type === "side" && this.hovered.id === side.id;
    const pulse = this.reducedMotion ? 0 : Math.sin(time * 3 + side.position.y) * 2;
    ctx.save();
    ctx.shadowBlur = done ? 0 : 12 + pulse;
    ctx.shadowColor = "#75efd3";
    ctx.fillStyle = done ? "#527b70cc" : "#1f6d65ee";
    ctx.strokeStyle = done ? "#86aa9f" : "#9dffe9";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(side.position.x, side.position.y, done ? 13 : 17 + pulse * .3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#effffb"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(done ? "✓" : side.icon, side.position.x, side.position.y);
    ctx.restore();
    if (hover) this.drawMarkerLabel(ctx, side.position, side.title, "#318d7c");
  }

  private drawExit(ctx: CanvasRenderingContext2D, time: number) {
    const ready = this.solved.size === this.level.puzzles.length;
    const pulse = this.reducedMotion ? 0 : Math.sin(time * 3) * 4;
    ctx.save(); ctx.translate(this.level.exit.x, this.level.exit.y);
    ctx.shadowBlur = ready ? 24 : 5; ctx.shadowColor = ready ? "#ffe77d" : "#9aa7ad";
    ctx.strokeStyle = ready ? "#fff1a6" : "#9ca6aa"; ctx.lineWidth = ready ? 5 : 3;
    ctx.beginPath(); ctx.arc(0, 0, 24 + pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ready ? "#6f5420dd" : "#303b43cc"; ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = ready ? "#fff3b5" : "#c2c9cb";
    ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ready ? "终" : `${this.solved.size}/4`, 0, 0); ctx.restore();
    if (this.hovered?.type === "exit" || ready) this.drawMarkerLabel(ctx, this.level.exit, ready ? "重组今日口令" : "终点尚未开启", ready ? "#b58b24" : "#67747b");
  }

  private drawHazard(ctx: CanvasRenderingContext2D, hazard: HazardSpec, time: number) {
    const phase = this.elapsedSeconds % hazard.period;
    const warning = phase >= hazard.warningFrom && phase < hazard.activeFrom;
    const active = phase >= hazard.activeFrom;
    if (!warning && !active && !this.dangerAssist) return;
    const alpha = active ? 0.34 : warning ? 0.16 + Math.sin(time * 10) * 0.08 : 0.08;
    const cx = hazard.rect.x + hazard.rect.width / 2; const cy = hazard.rect.y + hazard.rect.height / 2;
    ctx.save();
    ctx.fillStyle = this.hexAlpha(hazard.color, alpha);
    ctx.strokeStyle = hazard.color;
    ctx.lineWidth = active ? 5 : 3;
    ctx.setLineDash(active ? [] : [10, 7]);
    ctx.beginPath(); ctx.ellipse(cx, cy, hazard.rect.width / 2, hazard.rect.height / 2, -.12, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    if (warning || active) {
      ctx.fillStyle = "#1d2430"; ctx.fillRect(hazard.rect.x, hazard.rect.y - 25, Math.min(220, hazard.title.length * 15 + 44), 22);
      ctx.fillStyle = hazard.color; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(`${active ? "!" : "△"} ${hazard.title}`, hazard.rect.x + 7, hazard.rect.y - 14);
    }
    ctx.restore();
  }

  private drawBreadcrumbs(ctx: CanvasRenderingContext2D, time: number) {
    const points = [this.player, ...this.path];
    const risky = points.some((candidate) => this.level.hazards.some((hazard) => !this.isHazardDisabled(hazard) && this.hazardPhase(hazard) !== "safe" && inside(candidate, hazard.rect, 12)));
    ctx.fillStyle = risky ? "#ff9d63" : this.level.palette.accent;
    for (let i = 0; i < points.length - 1; i += 1) {
      const start = points[i]; const end = points[i + 1]; const length = distance(start, end);
      for (let along = 20; along < length; along += 34) {
        const t = along / length;
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        const bob = this.reducedMotion ? 0 : Math.sin(time * 5 + along) * 2;
        ctx.fillRect(Math.round(x) - 2, Math.round(y + bob) - 2, 5, 5);
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, time: number) {
    const bob = this.path.length && !this.reducedMotion ? Math.sin(time * 15) * 2 : 0;
    const x = Math.round(this.player.x); const y = Math.round(this.player.y + bob);
    ctx.fillStyle = "#17263388"; ctx.beginPath(); ctx.ellipse(x, y + 23, 19, 7, 0, 0, Math.PI * 2); ctx.fill();
    if (this.heroSprite) {
      ctx.save(); ctx.translate(x, y); ctx.scale(this.player.facing, 1);
      ctx.drawImage(this.heroSprite, -31, -66, 62, 92);
      ctx.restore();
      return;
    }
    ctx.fillStyle = "#26394b"; ctx.fillRect(x - 12, y + 11, 24, 8);
    ctx.fillStyle = "#f0b18a"; ctx.fillRect(x - 9, y - 19, 18, 16);
    ctx.fillStyle = "#4b352f"; ctx.fillRect(x - 10, y - 22, 20, 7);
    ctx.fillStyle = "#ffca5f"; ctx.fillRect(x - 12, y - 4, 24, 20);
    ctx.fillStyle = "#4274a8"; ctx.fillRect(x - 10, y + 16, 8, 10); ctx.fillRect(x + 3, y + 16, 8, 10);
    ctx.fillStyle = "#2c3142";
    const eyeX = this.player.facing === 1 ? x + 4 : x - 7;
    ctx.fillRect(eyeX, y - 13, 3, 3);
    ctx.fillStyle = "#ffffffaa"; ctx.fillRect(x - 8, y - 17, 4, 3);
  }

  private drawGuidance(ctx: CanvasRenderingContext2D, time: number) {
    const target = this.getCurrentPuzzle()?.position ?? (this.solved.size === this.level.puzzles.length ? this.level.exit : null);
    if (!target || this.paused) return;
    const screen = point(target.x - this.camera.x, target.y - this.camera.y);
    if (screen.x >= 44 && screen.x <= VIEW_WIDTH - 44 && screen.y >= 84 && screen.y <= VIEW_HEIGHT - 50) return;
    const center = point(VIEW_WIDTH / 2, VIEW_HEIGHT / 2);
    const dx = screen.x - center.x; const dy = screen.y - center.y;
    const scale = Math.min(390 / Math.max(1, Math.abs(dx)), 200 / Math.max(1, Math.abs(dy)));
    const x = center.x + dx * scale; const y = center.y + dy * scale;
    const angle = Math.atan2(dy, dx);
    const pulse = this.reducedMotion ? 0 : Math.sin(time * 5) * 3;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = this.level.palette.shadow; ctx.fillRect(-14, -15, 38 + pulse, 30);
    ctx.fillStyle = this.level.palette.accent;
    ctx.beginPath(); ctx.moveTo(25 + pulse, 0); ctx.lineTo(5, -11); ctx.lineTo(5, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#172536cc"; ctx.fillRect(x - 39, y + 18, 78, 22);
    ctx.fillStyle = "#fff7d0"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("当前目标", x, y + 29);
  }

  private resize() {
    this.canvas.width = VIEW_WIDTH * 2;
    this.canvas.height = VIEW_HEIGHT * 2;
  }

  private findPath(start: Point, end: Point): Point[] {
    const cols = Math.ceil(WORLD_WIDTH / GRID);
    const rows = Math.ceil(WORLD_HEIGHT / GRID);
    const toCell = (p: Point) => ({ x: clamp(Math.floor(p.x / GRID), 0, cols - 1), y: clamp(Math.floor(p.y / GRID), 0, rows - 1) });
    const startCell = toCell(start); const endCell = toCell(end);
    const key = (x: number, y: number) => `${x},${y}`;
    const open: Array<{ x: number; y: number; g: number; f: number }> = [{ ...startCell, g: 0, f: 0 }];
    const came = new Map<string, string>();
    const scores = new Map<string, number>([[key(startCell.x, startCell.y), 0]]);
    const blocked = (x: number, y: number) => {
      const center = point(x * GRID + GRID / 2, y * GRID + GRID / 2);
      const activeDanger = this.level.hazards.some((hazard) => !this.isHazardDisabled(hazard) && this.hazardPhase(hazard) === "active" && inside(center, hazard.rect, this.player.radius + 3));
      if (activeDanger) return true;
      if (x === endCell.x && y === endCell.y) return false;
      const outsideNavigation = this.level.route.slice(1).every((routePoint, index) => distanceToSegment(center, this.level.route[index], routePoint) > 118);
      return outsideNavigation || this.level.blockers.some((area) => inside(center, area, this.player.radius + 3));
    };
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let found = false;
    while (open.length > 0) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift();
      if (!current) break;
      if (current.x === endCell.x && current.y === endCell.y) { found = true; break; }
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx; const ny = current.y + dy;
        if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1 || blocked(nx, ny)) continue;
        const nextKey = key(nx, ny);
        const center = point(nx * GRID + GRID / 2, ny * GRID + GRID / 2);
        const warningCost = this.level.hazards.some((hazard) => !this.isHazardDisabled(hazard) && this.hazardPhase(hazard) === "warning" && inside(center, hazard.rect, 18)) ? 8 : 0;
        const tentative = current.g + 1 + warningCost;
        if (tentative >= (scores.get(nextKey) ?? Infinity)) continue;
        scores.set(nextKey, tentative);
        came.set(nextKey, key(current.x, current.y));
        open.push({ x: nx, y: ny, g: tentative, f: tentative + Math.abs(nx - endCell.x) + Math.abs(ny - endCell.y) });
      }
    }
    if (!found) return [];
    const cells: Point[] = [];
    let cursor = key(endCell.x, endCell.y);
    while (cursor !== key(startCell.x, startCell.y)) {
      const [x, y] = cursor.split(",").map(Number);
      cells.push(point(x * GRID + GRID / 2, y * GRID + GRID / 2));
      const previous = came.get(cursor);
      if (!previous) return [];
      cursor = previous;
    }
    cells.reverse();
    const simplified: Point[] = [];
    cells.forEach((cell, index) => {
      const previous = cells[index - 1]; const next = cells[index + 1];
      if (!previous || !next || (cell.x - previous.x !== next.x - cell.x || cell.y - previous.y !== next.y - cell.y)) simplified.push(cell);
    });
    simplified.push(end);
    return simplified;
  }

  private persistLevel() {
    const levelState: PersistedLevelState = {
      solved: [...this.solved], sideTasks: [...this.sideTasks], hintsUsed: this.hintCount, deaths: this.deathCount,
    };
    this.save.levels[this.level.id] = levelState;
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
  }

  private loadSave(): CampaignSave {
    const fresh: CampaignSave = { version: 2, unlocked: 1, completed: [], stamps: [], levels: {} };
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null") as Partial<CampaignSave> | null;
      if (!parsed || parsed.version !== 2) return fresh;
      return {
        version: 2,
        unlocked: clamp(parsed.unlocked ?? 1, 1, LEVELS.length),
        completed: Array.isArray(parsed.completed) ? parsed.completed : [],
        stamps: Array.isArray(parsed.stamps) ? parsed.stamps : [],
        levels: parsed.levels ?? {},
      };
    } catch {
      return fresh;
    }
  }

  private emitView() {
    this.hooks.onView(this.getView());
  }

  private hexAlpha(color: string, alpha: number) {
    if (!color.startsWith("#") || color.length !== 7) return color;
    return `${color}${Math.round(clamp(alpha, 0, 1) * 255).toString(16).padStart(2, "0")}`;
  }
}
