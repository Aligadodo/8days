import { LEVELS, getLevel } from "./levels";
import { WORLD, clamp, contains, distance, inHazard, p } from "./navigation";
import { WORLDS, LAYOUT_REVISION } from "./worldDesign";
import { buildWorldNavigation, mechanismOpen } from "./worldGeometry";
import { drawSurface, drawMechanism, drawMechanismPatch, hitMechanism } from "./mechanismRendering";
import { SceneRaster } from "./SceneRaster";
import { SpriteAtlas } from "./SpriteAtlas";
import { entitiesFor, entityDepth, type Entity } from "./entities";
import { drawBakedObject, drawPlacedSprite } from "./objectRendering";
import { EXPLORATION_PACKS } from "./exploration/packs";
import { allDiscoveries, discoveryEntity, roomPortal, settleDiscovery, earnedAchievements } from "./exploration/discoveries";
import type { RoomDefinition } from "./exploration/schema";
import { restoreCampaignSave } from "./campaignSave";
import { footstepFor } from "./footsteps";
import {
  HazardDirector,
  DEATH_TIMING,
  deathStage,
  gameTime,
  hazardCenter,
  hazardProfile,
  hazardContact,
} from "./hazardDirector";
import {
  drawHazardGround,
  drawHazardObject,
  drawSoul,
} from "./hazardRendering";
import type {
  CampaignHooks,
  CampaignSave,
  CampaignView,
  DeathInfo,
  HazardSpec,
  Point,
  PuzzleSpec,
} from "./types";

const SAVE_KEY = "one-more-day:campaign:v2";
const FOG = 32,
  FOG_COLS = 50,
  FOG_ROWS = 29,
  VISION = 205;
type Facing = "down" | "right" | "up" | "left";
interface Footprint extends Point {
  life: number;
  angle: number;
}
export class CampaignGame {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly atlas = new SpriteAtlas();
  private readonly sceneRaster = new SceneRaster();
  private readonly images = new Map<string, HTMLImageElement>();
  private readonly events = new AbortController();
  private readonly observer: ResizeObserver;
  private readonly minimap: HTMLCanvasElement;
  private readonly miniContext: CanvasRenderingContext2D;
  private nav = buildWorldNavigation(WORLDS[0], new Set());
  private levelIndex = 0;
  private level = LEVELS[0];
  private room: RoomDefinition | null = null;
  private sceneRevision = 0;
  private discoveryFlags = new Set<string>();
  private visitedRooms = new Set<string>();
  private roomExplored: Record<string, number[]> = {};
  private outsideExplored = new Set<number>();
  private returnPoint = p(0, 0);
  private discoveryHistory: string[] = [];
  private critters = new Map<string, { point: Point; route: Point[]; next: number; direction: number; stride: number; wait: number }>();
  private get pack() { return EXPLORATION_PACKS.find(pack => pack.day === this.level.day); }
  private get activeWorld() { return this.room?.world ?? WORLDS[this.levelIndex]; }
  private get activeHazards() { return this.room ? [] : this.level.hazards; }
  private get mapImage() { return this.images.get(this.room?.id ?? this.level.id); }
  private entities: Entity[] = entitiesFor(this.level);
  private player = { ...this.level.playerStart };
  private facing: Facing = "down";
  private camera = p(0, 0);
  private width = 960;
  private height = 540;
  private path: Point[] = [];
  private focus: Entity | null = null;
  private hovered: Entity | null = null;
  private pointer: Point | null = null;
  private pending: Entity | null = null;
  private actionTime = 0;
  private actionDuration = 0.4;
  private destination: Point | null = null;
  private destinationAge = 0;
  private waiting = false;
  private routeRetry = 0;
  private speed = 0;
  private stride = 0;
  private stepAt = 0;
  private footsteps: Footprint[] = [];
  private solved = new Set<string>();
  private worldFlags = new Set<string>();
  private sideTasks = new Set<string>();
  private doneAt = new Map<string, number>();
  private explored = new Set<number>();
  private discovered = new Set<string>();
  private checkpoint = { ...this.player };
  private hintStages: Record<string, number> = {};
  private hintCount = 0;
  private deathCount = 0;
  private elapsedSeconds = 0;
  private graceUntil = 5;
  private lastView = -1;
  private lastFrame = performance.now();
  private running = true;
  private started = false;
  private paused = true;
  private dead = false;
  private completed = false;
  private dangerAssist = false;
  private reducedMotion = false;
  private dragging = false;
  private dragOrigin = p(0, 0);
  private routeAt = 0;
  private lastBlockedAt = -10;
  private markedUntil = 0;
  private hazards = new HazardDirector();
  private deathScene: {
    hazard: HazardSpec;
    age: number;
    info: DeathInfo;
    delivered: boolean;
  } | null = null;
  private keys = new Set<string>();
  private save: CampaignSave;
  constructor(
    readonly canvas: HTMLCanvasElement,
    private readonly hooks: CampaignHooks,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.minimap = document.getElementById(
      "minimapCanvas",
    ) as HTMLCanvasElement;
    this.miniContext = this.minimap.getContext("2d")!;
    this.save = this.loadSave();
    LEVELS.forEach((level) => {
      const image = new Image();
      image.src = level.background;
      this.images.set(level.id, image);
    });
    EXPLORATION_PACKS.forEach(pack => {
      const image = new Image(); image.src = pack.room.background;
      this.images.set(pack.room.id, image);
      allDiscoveries(pack).forEach(node => [node.art, node.afterArt].forEach(art => {
        if (art) this.sceneRaster.preload(art).catch(() => hooks.onToast("探索物件图片未加载，请刷新重试。", "danger"));
      }));
    });
    this.atlas.ready.catch(() =>
      hooks.onToast("部分角色素材未载入，请刷新重试。", "danger"),
    );
    Promise.all([...WORLDS.flatMap(w => w.mechanisms.flatMap(m =>
      [m.art?.closed, m.art?.open].filter(a => a !== undefined).map(a => this.sceneRaster.preload(a)),
    )), ...WORLDS.flatMap(w => w.surfaces.flatMap(s => [s.art, ...(s.variants ?? [])]
      .filter(a => a !== undefined).map(a => this.sceneRaster.preload(a))))
    ]).catch(() => hooks.onToast("部分场景素材未载入，请刷新重试。", "danger"));
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    this.bindInput();
    requestAnimationFrame((time) => this.frame(time));
  }
  private refreshEntities() {
    const pack = this.pack;
    this.entities = this.room
      ? [...this.room.nodes.map(discoveryEntity), roomPortal(this.room, true)]
      : [...entitiesFor(this.level), ...(pack ? [...pack.outside.map(discoveryEntity), roomPortal(pack.room, false)] : [])];
    this.critters.clear();
    this.entities.filter(e => e.discovery?.animal).forEach(e => this.critters.set(e.id,
      { point: { x: e.x, y: e.y }, route: [], next: 0, direction: 1, stride: 0, wait: 1 }));
  }
  private explorationView(): CampaignView["exploration"] {
    const nodes = allDiscoveries(this.pack);
    const earned = new Set(earnedAchievements(this.pack, this.discoveryFlags).map(a => a.id));
    return { roomId: this.room?.id ?? null, sceneName: this.room?.name ?? this.level.name,
      roomName: this.pack?.room.name, flags: [...this.discoveryFlags], visited: this.visitedRooms.size,
      items: nodes.filter(n => n.reward && this.discoveryFlags.has(n.id)).map(n => ({ id: n.id, ...n.reward! })),
      discoveries: nodes.map(n => ({ id: n.id, title: n.title,
        location: this.pack?.outside.includes(n) ? "大地图" : this.pack?.room.name ?? "",
        description: this.discoveryFlags.has(n.id) ? n.result : n.description, done: this.discoveryFlags.has(n.id) })),
      achievements: this.pack?.achievements.map(a => ({ ...a, done: earned.has(a.id) })) ?? [],
      album: EXPLORATION_PACKS.map(pack => {
        const flags = pack.day === this.level.day ? this.discoveryFlags : new Set(this.save.levels[LEVELS[pack.day - 1].id]?.discoveries ?? []);
        const collectible = allDiscoveries(pack).filter(n => n.reward);
        return { day: pack.day, title: pack.theme, found: collectible.filter(n => flags.has(n.id)).length, total: collectible.length,
          visited: pack.day === this.level.day ? this.visitedRooms.has(pack.room.id) : Boolean(this.save.levels[LEVELS[pack.day - 1].id]?.visitedRooms?.includes(pack.room.id)) };
      }) };
  }
  /** Navigate to the physical doorway; the HUD never teleports through furniture. */
  visitRoom() {
    if (this.paused || this.dead || !this.pack) return;
    const portal = this.entities.find(e => e.portal);
    if (portal) this.navigate(portal.approach, portal, true);
  }
  private switchRoom(room: RoomDefinition | null) {
    if (room) {
      const image = this.images.get(room.id);
      if (!image?.complete || !image.naturalWidth) {
        this.hooks.onToast("房间图片尚未载入，请稍后再进；你仍在门外，可继续探索。", "danger");
        return;
      }
      this.returnPoint = { ...this.player };
      this.checkpoint = { ...this.returnPoint };
      this.outsideExplored = this.explored;
      this.room = room;
      this.explored = new Set(this.roomExplored[room.id] ?? []);
      this.visitedRooms.add(room.id);
      this.player = { ...room.world.spawn };
    } else {
      if (!this.room) return;
      this.roomExplored[this.room.id] = [...this.explored];
      this.room = null;
      this.explored = this.outsideExplored;
      this.player = { ...this.returnPoint };
    }
    this.sceneRevision++;
    this.discoveryHistory = [];
    this.keys.clear(); this.pointer = null; this.hovered = null; this.footsteps = [];
    this.refreshEntities(); this.rebuildNavigation(); this.discovered.clear();
    this.centerCamera(); this.reveal(); this.graceUntil = this.elapsedSeconds + 3;
    this.persist(); this.emitView();
    this.hooks.onAudio({ id: "mechanism.latch", caption: room ? "踏过门槛，脚步在屋内轻轻回响" : "穿过门口，回到熟悉的路边" });
    this.hooks.onToast(room ? room.intro : "已回到进门时的位置。房间里的发现保留在日志中。");
  }
  private interactDiscovery(entity: Entity) {
    const node = entity.discovery!;
    if (distance(this.player, entity.approach) > 12) return;
    const before = earnedAchievements(this.pack, this.discoveryFlags);
    const result = settleDiscovery(node, allDiscoveries(this.pack), this.discoveryFlags, this.discoveryHistory);
    this.hooks.onToast(result.message, result.status === "new" ? "success" : "normal");
    this.hooks.onAudio({ id: result.status === "locked" || result.status === "sequence" ? "interaction.blocked"
      : node.kind === "photo" ? "interaction.camera" : node.animal === "cat" ? "animal.cat"
      : node.animal === "dog" ? "animal.dog" : node.animal === "mouse" ? "animal.mouse" : node.reward?.category === "tool" ? "item.pickup.tool"
      : node.kind === "restore" ? "mechanism.latch" : node.reward ? "item.pickup.clue" : /铃|音叉/.test(node.title) ? "memory.cup" : "ui.click.soft",
      caption: node.animal ? `${node.title}靠近闻了闻，安心地停了一会儿` : undefined });
    if (result.status !== "new") return;
    this.doneAt.set(node.id, this.elapsedSeconds);
    this.rebuildNavigation(); this.persist(); this.emitView();
    const newlyEarned = earnedAchievements(this.pack, this.discoveryFlags).filter(a => !before.some(b => b.id === a.id));
    if (newlyEarned.length) this.hooks.onAudio({ id: "achievement.unlock", caption: `地方成就：${newlyEarned.map(a => a.title).join("、")} · 已存入日志` });
  }
  private updateCritters(delta: number) {
    for (const entity of this.entities) {
      const animal = this.critters.get(entity.id), patrol = entity.discovery?.patrol;
      if (!animal || !patrol?.length) continue;
      // Freeze while approached so chasing a moving hotspot never blocks interaction.
      if (this.focus?.id === entity.id || this.pending?.id === entity.id) continue;
      animal.wait -= delta;
      if (animal.wait > 0) continue;
      if (!animal.route.length) {
        const target = patrol[animal.next++ % patrol.length];
        animal.route = this.nav.route(animal.point, target, () => false, 0);
        if (!animal.route.length) { animal.wait = 1; continue; }
      }
      const target = animal.route[0], length = distance(animal.point, target), step = Math.min(length, delta * (entity.discovery?.animal === "mouse" ? 30 : 20));
      if (length < 0.3) animal.route.shift();
      else {
        const next = p(animal.point.x + (target.x - animal.point.x) * step / length, animal.point.y + (target.y - animal.point.y) * step / length);
        if (this.nav.visible(animal.point, next)) {
          if (Math.abs(next.x - animal.point.x) > .05) animal.direction = next.x > animal.point.x ? 1 : -1;
          animal.point = next; animal.stride += step;
        } else animal.route = [];
      }
      entity.approach = { ...animal.point };
      if (!animal.route.length) animal.wait = 1.5 + animal.next % 3;
    }
  }
  getSave() {
    return structuredClone(this.save);
  }
  getLevel() {
    return this.level;
  }
  getView(): CampaignView {
    const currentPuzzle = this.currentPuzzle();
    const access = this.accessMechanism(currentPuzzle?.id);
    return {
      exploration: this.explorationView(),
      levelIndex: this.levelIndex,
      level: this.level,
      solved: [...this.solved],
      sideTasks: [...this.sideTasks],
      worldFlags: [...this.worldFlags],
      worldItems: WORLDS[this.levelIndex].mechanisms
        .filter((m) => m.reward && this.worldFlags.has(m.id))
        .map((m) => m.reward!),
      accessHint: access
        ? (access.requires ?? []).every((id) => this.flags().has(id))
          ? `机关已通电。找到${access.name}，点击操作后，检修暗门会打开。`
          : access.hint
        : undefined,
      inventory: this.level.puzzles
        .filter((q) => this.solved.has(q.id))
        .map((q) => q.rewardItem),
      currentPuzzle,
      objective: this.room ? `自由探索 · ${this.room.name}` : access
        ? `操作 · ${access.name}`
        : currentPuzzle
          ? `调查 · ${currentPuzzle.title}`
          : "前往终点，重组今天的四段记忆",
      completed: this.completed,
      deaths: this.deathCount,
      hintsUsed: this.hintCount,
      elapsedSeconds: this.elapsedSeconds,
    };
  }
  startLevel(index: number, resetRun = false) {
    this.sceneRevision++;
    this.room = null;
    this.started = true;
    this.levelIndex = clamp(Math.floor(index), 0, 7);
    this.level = getLevel(this.levelIndex);
    const world = WORLDS[this.levelIndex];
    this.refreshEntities();
    const saved = resetRun ? undefined : this.save.levels[this.level.id];
    // Collection is a travel album, not a consumable run reward. Replaying a day retains it.
    const album = this.save.levels[this.level.id];
    const ids = new Set(allDiscoveries(this.pack).map(node => node.id));
    this.discoveryFlags = new Set((album?.discoveries ?? []).filter(id => ids.has(id)));
    this.visitedRooms = new Set((album?.visitedRooms ?? []).filter(id => id === this.pack?.room.id));
    this.roomExplored = { ...album?.roomExplored };
    this.discoveryHistory = [];
    this.solved = new Set(saved?.solved ?? []);
    this.worldFlags = new Set(
      (saved?.worldFlags ?? []).filter((id) =>
        world.mechanisms.some((m) => m.id === id && m.kind !== "gate"),
      ),
    );
    // Older saves already beyond the new cabinet puzzle keep their progression.
    if (
      this.levelIndex === 1 &&
      ["alarm", "stair-map", "door-code"].some((id) => this.solved.has(id))
    )
      this.worldFlags.add("office-latch");
    this.sideTasks = new Set(saved?.sideTasks ?? []);
    this.hintStages = { ...saved?.hintStages };
    this.rebuildNavigation();
    this.hintCount = saved?.hintsUsed ?? 0;
    this.deathCount = saved?.deaths ?? 0;
    this.explored = new Set(
      (saved?.explored ?? []).filter(
        (n) => Number.isInteger(n) && n >= 0 && n < FOG_COLS * FOG_ROWS,
      ),
    );
    this.outsideExplored = this.explored;
    this.discovered.clear();
    const reachable = (q: Point) =>
      this.nav.isWalkable(q) &&
      this.nav.route(world.spawn, q, () => false, 0).length > 0;
    const remembered = [...this.level.puzzles]
      .reverse()
      .find((q) => this.solved.has(q.id) && reachable(world.approaches[q.id]));
    this.checkpoint =
      saved?.layoutRevision === LAYOUT_REVISION &&
      saved.checkpoint &&
      reachable(saved.checkpoint)
        ? { ...saved.checkpoint }
        : { ...(remembered ? world.approaches[remembered.id] : world.spawn) };
    this.player = { ...this.checkpoint };
    this.elapsedSeconds = 0;
    this.graceUntil = 5;
    this.lastView = -1;
    this.completed = false;
    this.dead = false;
    this.deathScene = null;
    this.hooks.onCinematic?.(false);
    this.paused = false;
    this.facing = "down";
    this.doneAt.clear();
    this.hazards.reset();
    this.cancel();
    this.footsteps = [];
    this.hovered = null;
    this.pointer = null;
    this.reveal();
    this.centerCamera();
    this.persist();
    this.emitView();
    this.hooks.onToast(
      saved && saved.layoutRevision !== LAYOUT_REVISION
        ? "地图已重新标定。线索与成就已保留，回到最近的安全操作点。"
        : `DAY ${this.level.day} · ${this.level.name}。鼠标停在物件上时，会显示细光边。`,
    );
    this.hooks.onAudio({ id: "music.spring.intro" });
  }
  setPaused(paused: boolean) {
    if (this.dead) return;
    this.paused = paused;
    if (paused) {
      this.cancel();
      this.keys.clear();
    } else this.graceUntil = this.elapsedSeconds + 2;
  }
  setDangerAssist(enabled: boolean) {
    this.dangerAssist = enabled;
  }
  setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
  }
  solvePuzzle(id: string) {
    if (this.dead) return;
    const puzzle = this.level.puzzles.find((q) => q.id === id);
    if (
      !puzzle ||
      this.solved.has(id) ||
      !this.available(puzzle) ||
      this.accessMechanism(id)
    )
      return;
    this.solved.add(id);
    this.doneAt.set(id, this.elapsedSeconds);
    this.checkpoint = { ...this.player };
    this.rebuildNavigation();
    WORLDS[this.levelIndex].mechanisms
      .filter((m) => m.controlledBy === id)
      .forEach((m) => this.doneAt.set(m.id, this.elapsedSeconds));
    this.persist();
    this.emitView();
    this.hooks.onToast(`${puzzle.solvedText} · 已记住此处位置`, "success");
    this.hooks.onAudio({
      id: id === "mill" ? "puzzle.mill.solve" : "puzzle.solve",
    });
  }
  hintStage(id: string) {
    return this.hintStages[id] ?? 0;
  }
  registerHint(id?: string, stage?: number) {
    if (id && stage !== undefined) {
      const old = this.hintStages[id] ?? 0;
      if (stage <= old) return;
      this.hintCount += stage - old;
      this.hintStages[id] = stage;
    } else this.hintCount++;
    this.persist();
    this.emitView();
  }
  locateCurrent() {
    this.markedUntil = this.elapsedSeconds + 8;
    this.hooks.onToast(
      "目标已在小地图标记 8 秒；阴影区域需要先探索。正门、桥面和步道可以通行。",
    );
  }
  submitFinal(code: string) {
    if (this.dead) return false;
    if (this.solved.size !== 4 || code !== this.level.code) return false;
    this.completed = true;
    this.paused = true;
    if (!this.save.completed.includes(this.level.id))
      this.save.completed.push(this.level.id);
    this.save.stamps = LEVELS.filter((level) =>
      this.save.completed.includes(level.id),
    ).map((level) => level.stamp);
    this.save.unlocked = Math.max(
      this.save.unlocked,
      Math.min(8, this.levelIndex + 2),
    );
    this.persist();
    this.emitView();
    this.hooks.onAudio({ id: "achievement.unlock" });
    this.hooks.onComplete(this.level, this.getView());
    return true;
  }
  restartAfterDeath() {
    if (this.deathScene && !this.deathScene.delivered) return;
    this.dead = false;
    this.deathScene = null;
    this.hazards.reset();
    this.hooks.onCinematic?.(false);
    this.paused = false;
    this.cancel();
    this.keys.clear();
    this.player = { ...this.checkpoint };
    this.graceUntil = this.elapsedSeconds + 6;
    this.centerCamera();
    this.emitView();
  }
  isInDeathSequence() {
    return this.dead;
  }
  /** Called only by the explicit development review toolbar, never by normal play. */
  previewRoom(index: number) {
    this.startLevel(index, true);
    if (!this.pack) return;
    // This is a developer inspection shortcut, not the normal entrance path.
    this.player = { ...this.pack.room.entry.approach };
    this.switchRoom(this.pack.room);
  }
  /** Called only by the explicit development review toolbar, never by normal play. */
  previewSignAccident() {
    this.startLevel(0, true);
    this.player = p(870, 340);
    this.graceUntil = 3;
    this.centerCamera();
    this.reveal();
    this.hooks.onToast(
      "事故评审：3 秒后招牌开始预警。点击两侧地面可撤离，原地等待可观察完整事故。",
    );
  }
  saveNow() {
    this.persist();
    return new Date();
  }
  resetCampaignSave() {
    this.started = false;
    this.paused = true;
    this.save = {
      version: 2,
      unlocked: 1,
      completed: [],
      stamps: [],
      levels: {},
    };
    this.cancel();
    this.solved.clear();
    this.worldFlags.clear();
    this.sideTasks.clear();
    this.explored.clear();
    this.hintStages = {};
    this.discoveryFlags.clear(); this.visitedRooms.clear(); this.roomExplored = {}; this.room = null;
    localStorage.removeItem(SAVE_KEY);
  }
  destroy() {
    this.running = false;
    this.events.abort();
    this.observer.disconnect();
  }
  private available(puzzle: PuzzleSpec) {
    return (puzzle.requires ?? []).every((id) => this.solved.has(id));
  }
  private flags() {
    return new Set([...this.solved, ...this.worldFlags, ...this.discoveryFlags]);
  }
  private rebuildNavigation() {
    this.nav = buildWorldNavigation(this.activeWorld, this.flags());
    this.cancel();
  }
  private accessMechanism(puzzleId?: string) {
    const world = WORLDS[this.levelIndex];
    const id = (world.puzzleAccess[puzzleId ?? ""] ?? []).find(
      (id) => !this.worldFlags.has(id),
    );
    return world.mechanisms.find((m) => m.id === id);
  }
  private visibleEntity(entity: Entity) {
    if (entity.discovery?.art && !entity.discovery.baked && this.done(entity) && !entity.discovery.afterArt && !entity.discovery.animal) return false;
    return (
      entity.mechanism?.kind !== "cache" ||
      (entity.mechanism.requires ?? []).every((id) => this.flags().has(id))
    );
  }
  private currentPuzzle() {
    return (
      this.level.puzzles.find(
        (q) => !this.solved.has(q.id) && this.available(q),
      ) ?? null
    );
  }
  private emitView() {
    this.hooks.onView(this.getView());
  }
  private resize() {
    const rect = this.canvas.getBoundingClientRect(),
      ratio = rect.width / Math.max(1, rect.height);
    this.width = ratio < 1 ? Math.min(560, 900 * ratio) : 960;
    this.height = this.width / ratio;
    const scale = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(rect.width * scale);
    this.canvas.height = Math.round(rect.height * scale);
    this.centerCamera();
  }
  private centerCamera() {
    this.camera = p(
      clamp(
        this.player.x - this.width / 2,
        0,
        Math.max(0, WORLD.width - this.width),
      ),
      clamp(
        this.player.y - this.height / 2,
        0,
        Math.max(0, WORLD.height - this.height),
      ),
    );
  }
  private worldPoint(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return p(
      ((event.clientX - rect.left) / rect.width) * this.width + this.camera.x,
      ((event.clientY - rect.top) / rect.height) * this.height + this.camera.y,
    );
  }
  private bindInput() {
    const signal = this.events.signal;
    this.canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (this.paused || this.dead) return;
        this.canvas.focus();
        if (event.button === 2) {
          this.cancel();
          return;
        }
        if (event.button !== 0) return;
        this.dragging = true;
        this.dragOrigin = p(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
        this.pointer = p(event.clientX, event.clientY);
        const q = this.worldPoint(event),
          entity = this.hit(q);
        this.navigate(entity ? this.entityPosition(entity) : q, entity, true);
      },
      { signal },
    );
    this.canvas.addEventListener(
      "pointermove",
      (event) => {
        if (this.paused || this.dead) return;
        this.pointer = p(event.clientX, event.clientY);
        this.hovered = this.hit(this.worldPoint(event));
        this.canvas.style.cursor = this.hovered
          ? "pointer"
          : this.nav.isWalkable(this.worldPoint(event))
            ? "default"
            : "not-allowed";
        if (
          this.dragging &&
          !this.focus &&
          distance(this.dragOrigin, p(event.clientX, event.clientY)) > 9 &&
          performance.now() - this.routeAt > 140
        ) {
          this.routeAt = performance.now();
          this.navigate(this.worldPoint(event), null, false);
        }
      },
      { signal },
    );
    const release = () => {
      this.dragging = false;
    };
    this.canvas.addEventListener("pointerup", release, { signal });
    this.canvas.addEventListener("pointercancel", release, { signal });
    this.canvas.addEventListener(
      "pointerleave",
      () => {
        this.pointer = null;
        this.hovered = null;
      },
      { signal },
    );
    this.canvas.addEventListener(
      "contextmenu",
      (event) => event.preventDefault(),
      { signal },
    );
    window.addEventListener(
      "keydown",
      (event) => {
        if (
          this.paused ||
          this.dead ||
          event.target instanceof HTMLInputElement
        )
          return;
        const key = event.key.toLowerCase();
        if (
          [
            "w",
            "a",
            "s",
            "d",
            "arrowup",
            "arrowleft",
            "arrowdown",
            "arrowright",
          ].includes(key)
        ) {
          event.preventDefault();
          if (!this.keys.has(key)) {
            this.keys.add(key);
            this.cancel();
          }
        }
        if (key === "e" && !event.repeat) {
          const entity = this.entities
            .filter(
              (q) =>
                this.visibleEntity(q) && distance(q.approach, this.player) < 95,
            )
            .sort(
              (a, b) =>
                distance(this.entityPosition(a), this.player) -
                distance(this.entityPosition(b), this.player),
            )[0];
          if (entity) this.navigate(this.entityPosition(entity), entity, true);
        }
        if (key === "escape") this.cancel();
      },
      { signal },
    );
    window.addEventListener(
      "keyup",
      (event) => {
        if (this.keys.delete(event.key.toLowerCase()) && !this.keys.size)
          this.cancel();
      },
      { signal },
    );
    window.addEventListener(
      "blur",
      () => {
        this.keys.clear();
        this.dragging = false;
        this.cancel();
      },
      { signal },
    );
    document.addEventListener(
      "visibilitychange",
      () => {
        this.lastFrame = performance.now();
        if (document.hidden) {
          this.keys.clear();
          this.cancel();
          this.persist();
        }
      },
      { signal },
    );
    window.addEventListener("pagehide", () => this.persist(), { signal });
    this.minimap.addEventListener(
      "pointerdown",
      (event) => {
        if (this.paused || this.dead) return;
        event.preventDefault();
        const rect = this.minimap.getBoundingClientRect(),
          q = p(
            ((event.clientX - rect.left) / rect.width) * 1600,
            ((event.clientY - rect.top) / rect.height) * 900,
          );
        if (!this.seen(q)) {
          this.hooks.onToast("这里还没有探索；先走到阴影边缘看看。");
          return;
        }
        const target = this.entities
          .filter((e) => this.visibleEntity(e) && this.discovered.has(e.id))
          .find((e) => distance(this.entityPosition(e), q) < 65);
        this.navigate(
          target ? this.entityPosition(target) : q,
          target ?? null,
          true,
        );
      },
      { signal },
    );
  }
  private cancel() {
    this.path = [];
    this.focus = null;
    this.pending = null;
    this.destination = null;
    this.speed = 0;
    this.waiting = false;
    this.dragging = false;
  }
  private hit(q: Point) {
    const entry = !this.room ? this.pack?.room.entry : undefined;
    if (entry?.sharedTarget && contains(q, entry.baked)) return this.entities.find(e => e.portal) ?? null;
    return (
      [...this.entities]
        .filter(
          (e) =>
            this.visibleEntity(e) &&
            !(e.mechanism?.kind === "gate" && this.done(e)),
        )
        .sort((a, b) => entityDepth(b, this.entityPosition(b)) - entityDepth(a, this.entityPosition(a)))
        .find((entity) => {
          const pos = this.entityPosition(entity);
          if (entity.discovery?.art) return this.sceneRaster.hit(this.done(entity) ? entity.discovery.afterArt ?? entity.discovery.art : entity.discovery.art, pos, q);
          if (entity.mechanism)
            return hitMechanism(this.sceneRaster, entity.mechanism, this.done(entity), q);
          if (entity.baked) return contains(q, entity.baked);
          return this.atlas.hit(
            entity.atlas,
            this.entityFrame(entity),
            entity.height,
            (q.x - pos.x) * (entity.discovery?.animal ? this.critters.get(entity.id)?.direction ?? 1 : 1),
            q.y - pos.y,
            entity.visual?.maxWidth,
          );
        }) ?? null
    );
  }
  private done(entity: Entity) {
    if (entity.discovery) return this.discoveryFlags.has(entity.id);
    if (entity.portal) return false;
    if (entity.mechanism) return mechanismOpen(entity.mechanism, this.flags());
    return entity.type === "puzzle"
      ? this.solved.has(entity.id)
      : entity.type === "side"
        ? this.sideTasks.has(entity.id)
        : this.solved.size === 4;
  }
  private entityFrame(entity: Entity) {
    if (entity.discovery?.animal) {
      const animal = this.critters.get(entity.id);
      return entity.frame + (animal?.route.length ? Math.floor(animal.stride / 9) % 4 : 0);
    }
    return this.done(entity) && entity.doneFrame !== undefined
      ? entity.doneFrame
      : entity.frame;
  }
  private entityPosition(entity: Entity) {
    if (entity.discovery?.animal) return this.critters.get(entity.id)?.point ?? p(entity.x, entity.y);
    const position = p(entity.x, entity.y);
    if (!this.done(entity)) return position;
    const progress = this.reducedMotion
      ? 1
      : clamp(
          (this.elapsedSeconds - (this.doneAt.get(entity.id) ?? -10)) / 0.9,
          0,
          1,
        );
    if (entity.id === "help-cat") {
      position.x -= 40 * progress;
      position.y -= 9 * progress;
    }
    if (entity.id === "bee") {
      position.x += 28 * progress;
      position.y -= 24 * progress;
    }
    if (entity.id === "bat") {
      position.x -= 18 * progress;
      position.y -= 65 * progress;
    }
    return position;
  }
  private navigate(q: Point, entity: Entity | null, sound: boolean) {
    const dragging = this.dragging;
    this.cancel();
    this.dragging = dragging;
    const wanted = entity ? entity.approach : q;
    const endpoint = entity
      ? this.nav.isWalkable(wanted)
        ? wanted
        : null
      : this.nav.nearest(wanted, 14);
    // A temporary hazard is not a wall. Keep the intended landing point and wait
    // at its edge if no safe detour exists, rather than silently changing the goal.
    let path = endpoint
      ? this.nav.route(this.player, endpoint, this.blocked, 0)
      : [];
    if (!path.length && endpoint)
      path = this.nav.route(this.player, endpoint, () => false, 0);
    if (!path.length) {
      if (sound && this.elapsedSeconds - this.lastBlockedAt > 2) {
        this.lastBlockedAt = this.elapsedSeconds;
        this.hooks.onToast(
          entity?.mechanism?.hint ??
            this.accessMechanism(entity?.id)?.hint ??
            (() => {
              const obstacle = this.activeWorld.obstacles.find((o) =>
                contains(q, o.polygon),
              );
              return obstacle
                ? `这里是${obstacle.name}，不能穿过。请沿旁边的地面绕行。`
                : "这里没有相连的落脚点。只能走桥面、地面和台阶；门要先打开。";
            })(),
        );
        this.hooks.onAudio({ id: "nav.route.blocked" });
      }
      return;
    }
    this.path = path;
    this.focus = entity;
    this.destination = { ...path.at(-1)! };
    this.destinationAge = 0.65;
    if (sound) this.hooks.onAudio({ id: "nav.route.accept" });
  }
  private blocked = (q: Point) =>
    this.activeHazards.some((h) => {
      if (this.phase(h) !== "active" || !inHazard(q, h.rect, 9)) return false;
      // Only someone already inside the lethal footprint may escape; the safety margin
      // must not accidentally grant permission to walk into the hazard.
      if (!inHazard(this.player, h.rect, 5)) return true;
      const center = p(
        h.rect.x + h.rect.width / 2,
        h.rect.y + h.rect.height / 2,
      );
      return distance(q, center) < distance(this.player, center) - 0.1;
    });
  private phase(h: HazardSpec) {
    if (h.disabledBy && this.solved.has(h.disabledBy)) return "safe";
    return this.hazards.phase(h);
  }
  private arrive(entity: Entity) {
    if (
      !this.visibleEntity(entity) ||
      distance(entity.approach, this.player) > 10
    )
      return;
    const mechanism = entity.mechanism;
    if (
      mechanism &&
      (mechanism.kind === "gate" ||
        this.done(entity) ||
        !(mechanism.requires ?? []).every((id) => this.flags().has(id)))
    ) {
      this.hooks.onToast(
        this.done(entity) ? mechanism.complete : mechanism.hint,
      );
      this.hooks.onAudio({ id: "interaction.blocked" });
      return;
    }
    this.pending = entity;
    this.actionDuration =
      mechanism?.kind === "breakable"
        ? 1.05
        : mechanism?.kind === "lever"
          ? 1.15
          : mechanism?.kind === "cache"
            ? 0.55
            : entity.discovery?.kind === "restore" ? 0.85
              : entity.discovery?.kind === "photo" ? 0.5
                : entity.discovery?.kind === "pet" ? 0.65 : 0.4;
    this.actionTime = this.actionDuration;
    if (mechanism?.kind === "lever")
      this.hooks.onAudio({
        id: "mechanism.slide",
        caption: "咔嗒，墙内锁舌松开，壁板沿暗轨退开",
      });
    this.speed = 0;
    this.face(entity.x - this.player.x, entity.y - this.player.y);
  }
  private interact(entity: Entity) {
    if (entity.portal) {
      if (entity.portal === "outside") this.switchRoom(null);
      else {
        const shared = this.pack?.room.entry.sharedTarget;
        const task = shared ? this.entities.find(e => e.id === shared) : undefined;
        if (task && this.hooks.onDoorChoice) {
          const room = this.pack!.room, revision = this.sceneRevision;
          let handled = false;
          const choose = (action: () => void) => {
            // A cancelled dialog or a stale callback from another day must not teleport the player.
            if (handled || !this.paused || this.dead || revision !== this.sceneRevision) return;
            handled = true;
            this.setPaused(false);
            action();
          };
          this.setPaused(true);
          this.hooks.onDoorChoice(room.name,
            () => choose(() => this.switchRoom(room)),
            () => choose(() => distance(this.player, task.approach) <= 10
              ? this.interact(task) : this.navigate(task.approach, task, true)));
        } else if (this.pack) this.switchRoom(this.pack.room);
      }
      return;
    }
    if (entity.discovery) { this.interactDiscovery(entity); return; }
    if (entity.mechanism) {
      const m = entity.mechanism;
      if (
        m.kind === "gate" ||
        this.done(entity) ||
        !(m.requires ?? []).every((id) => this.flags().has(id))
      )
        return;
      this.worldFlags.add(m.id);
      this.doneAt.set(m.id, this.elapsedSeconds);
      WORLDS[this.levelIndex].mechanisms
        .filter((g) => g.controlledBy === m.id)
        .forEach((g) => this.doneAt.set(g.id, this.elapsedSeconds));
      this.checkpoint = { ...this.player };
      this.rebuildNavigation();
      this.reveal();
      this.persist();
      this.emitView();
      this.hooks.onToast(m.complete, "success");
      this.hooks.onAudio({
        id:
          m.kind === "breakable"
            ? "mechanism.crumble"
            : m.kind === "tool"
              ? "item.pickup.tool"
              : m.kind === "cache"
                ? "item.pickup.clue"
                : "mechanism.latch",
        caption:
          m.kind === "breakable"
            ? "碎石落到两边，墙内壁龛露出来了"
            : m.kind === "cache"
              ? "翻开一页旧手记"
              : undefined,
      });
      return;
    }
    if (entity.type === "exit") {
      if (this.solved.size < 4) {
        this.hooks.onToast(
          `还差 ${4 - this.solved.size} 段记忆。展开任务卡可以定位下一处。`,
        );
        return;
      }
      this.setPaused(true);
      this.hooks.onFinal(this.level);
      return;
    }
    if (entity.type === "puzzle") {
      const puzzle = this.level.puzzles.find((q) => q.id === entity.id)!;
      if (this.solved.has(puzzle.id)) {
        this.hooks.onToast(
          `${puzzle.symbol}＝${puzzle.rewardDigit} · ${puzzle.rewardItem}`,
        );
        return;
      }
      if (!this.available(puzzle)) {
        const names = (puzzle.requires ?? [])
          .filter((id) => !this.solved.has(id))
          .map((id) => this.level.puzzles.find((q) => q.id === id)!.title);
        this.hooks.onToast(`需要先调查：${names.join("、")}。`);
        return;
      }
      const access = this.accessMechanism(puzzle.id);
      if (access) {
        this.hooks.onToast(access.hint);
        return;
      }
      this.setPaused(true);
      this.hooks.onPuzzle(puzzle);
      return;
    }
    const task = this.level.sideTasks.find((q) => q.id === entity.id)!;
    if (this.sideTasks.has(task.id)) {
      this.hooks.onToast(task.completeText);
      return;
    }
    this.sideTasks.add(task.id);
    this.doneAt.set(task.id, this.elapsedSeconds);
    this.persist();
    this.emitView();
    this.hooks.onToast(task.completeText, "success");
    this.hooks.onAudio({
      id:
        task.id === "help-cat"
          ? "animal.cat"
          : task.id === "call-home"
            ? "interaction.phone"
            : task.id === "photo"
              ? "interaction.camera"
              : "task.complete",
      caption:
        task.id === "help-cat" ? "小猫轻轻喵了一声，走到檐下" : "小事完成",
    });
  }
  private face(dx: number, dy: number) {
    if (Math.hypot(dx, dy) < 0.1) return;
    const horizontal = this.facing === "left" || this.facing === "right";
    if (Math.abs(dx) > Math.abs(dy) * (horizontal ? 0.76 : 1.22))
      this.facing = dx > 0 ? "right" : "left";
    else if (Math.abs(dy) > Math.abs(dx) * (horizontal ? 1.22 : 0.76))
      this.facing = dy > 0 ? "down" : "up";
  }
  private frame(time: number) {
    if (!this.running) return;
    const delta = Math.min(0.04, (time - this.lastFrame) / 1000);
    this.lastFrame = time;
    if (!document.hidden) {
      if (this.dead) this.updateDeath(delta);
      else if (!this.paused) this.update(delta);
    }
    this.draw();
    requestAnimationFrame((next) => this.frame(next));
  }
  private update(delta: number) {
    if (this.paused || this.dead || document.hidden) return;
    this.elapsedSeconds += delta;
    this.updateCritters(delta);
    this.destinationAge = Math.max(0, this.destinationAge - delta);
    this.footsteps = this.footsteps.filter((f) => {
      f.life -= delta;
      return f.life > 0;
    });
    if (this.pending) {
      const beforeProgress = 1 - this.actionTime / this.actionDuration;
      this.actionTime -= delta;
      if (this.pending.mechanism?.kind === "breakable")
        for (const beat of [0.27, 0.66])
          if (
            beforeProgress < beat &&
            1 - this.actionTime / this.actionDuration >= beat
          )
            this.hooks.onAudio({
              id: "mechanism.strike",
              caption: "笃，薄墙的裂纹扩开了",
            });
      if (this.actionTime <= 0) {
        const target = this.pending;
        this.pending = null;
        this.interact(target);
      }
    }
    if (this.paused) return;
    let keyX =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft"));
    let keyY =
      Number(this.keys.has("s") || this.keys.has("arrowdown")) -
      Number(this.keys.has("w") || this.keys.has("arrowup"));
    if (keyX || keyY) {
      const length = Math.hypot(keyX, keyY);
      keyX /= length;
      keyY /= length;
      const next = p(this.player.x + keyX * 24, this.player.y + keyY * 24);
      this.path = this.nav.visible(this.player, next, this.blocked)
        ? [next]
        : [];
      this.focus = null;
      this.destination = null;
    }
    if (this.waiting && this.destination) {
      this.routeRetry -= delta;
      if (this.routeRetry <= 0) {
        this.routeRetry = 0.6;
        const route = this.nav.route(
          this.player,
          this.destination,
          this.blocked,
          10,
        );
        if (route.length) {
          this.path = route;
          this.waiting = false;
        }
      }
    }
    const remaining = this.path.reduce(
      (sum, q, i) => sum + distance(i ? this.path[i - 1] : this.player, q),
      0,
    );
    const targetSpeed = this.path.length
      ? Math.min(180, Math.max(55, Math.sqrt(remaining * 1100)))
      : 0;
    this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-delta * 15));
    let budget = this.speed * delta;
    const before = { ...this.player };
    while (budget > 0 && this.path.length) {
      const next = this.path[0],
        length = distance(this.player, next),
        step = Math.min(budget, length);
      if (length < 0.05) {
        this.path.shift();
        continue;
      }
      const candidate = p(
        this.player.x + ((next.x - this.player.x) * step) / length,
        this.player.y + ((next.y - this.player.y) * step) / length,
      );
      // Static collision is authoritative even for stale paths or a changing world.
      if (!this.nav.visible(this.player, candidate)) {
        this.cancel();
        break;
      }
      if (this.blocked(candidate)) {
        this.waiting = Boolean(this.destination);
        this.routeRetry = 0.6;
        this.path = [];
        this.speed = 0;
        this.hooks.onToast(
          "前方危险正在发生，已停在边缘；结束后继续走。右键可取消。",
        );
        break;
      }
      this.player = candidate;
      budget -= step;
      if (step >= length - 0.01) this.path.shift();
    }
    const travelled = distance(before, this.player);
    if (travelled > 0.03) {
      this.face(this.player.x - before.x, this.player.y - before.y);
      this.stride += travelled;
      if (this.stride - this.stepAt >= 27) {
        this.stepAt = this.stride;
        this.footsteps.push({
          ...this.player,
          life: 1.3,
          angle: Math.atan2(this.player.y - before.y, this.player.x - before.x),
        });
        this.hooks.onAudio({
          id: footstepFor(this.nav.regionAt(this.player), this.player, this.room?.id),
        });
      }
    }
    if (!this.path.length && !this.waiting) {
      this.speed = 0;
      if (this.focus) {
        const target = this.focus;
        this.focus = null;
        this.destination = null;
        this.arrive(target);
      }
    }
    const smooth = 1 - Math.exp(-delta * 9);
    this.camera.x +=
      (clamp(
        this.player.x - this.width / 2,
        0,
        Math.max(0, WORLD.width - this.width),
      ) -
        this.camera.x) *
      smooth;
    this.camera.y +=
      (clamp(
        this.player.y - this.height / 2,
        0,
        Math.max(0, WORLD.height - this.height),
      ) -
        this.camera.y) *
      smooth;
    if (this.pointer) {
      const rect = this.canvas.getBoundingClientRect();
      this.hovered = this.hit(
        p(
          ((this.pointer.x - rect.left) / rect.width) * this.width +
            this.camera.x,
          ((this.pointer.y - rect.top) / rect.height) * this.height +
            this.camera.y,
        ),
      );
    }
    this.reveal();
    this.updateHazards(delta);
    const second = Math.floor(this.elapsedSeconds);
    if (second !== this.lastView) {
      this.lastView = second;
      this.emitView();
      if (second % 5 === 0) this.persist();
    }
  }
  private updateHazards(delta: number) {
    for (const hazard of this.activeHazards) {
      const center = hazardCenter(hazard),
        profile = hazardProfile(hazard);
      const presented =
        center.x > this.camera.x + 25 &&
        center.x < this.camera.x + this.width - 25 &&
        center.y > this.camera.y + (profile.once ? 155 : 55) &&
        center.y < this.camera.y + this.height - 45;
      const events = this.hazards.update(
        hazard,
        delta,
        this.player,
        this.elapsedSeconds > this.graceUntil,
        presented,
        Boolean(hazard.disabledBy && this.solved.has(hazard.disabledBy)),
      );
      const pan = clamp((center.x - this.player.x) / 300, -1, 1);
      for (const event of events) {
        if (event.type === "warning")
          this.hooks.onAudio({
            id: profile.warnSound,
            caption: hazard.warning,
            pan,
          });
        if (event.type === "release" && profile.once)
          this.hooks.onAudio({
            id: "hazard.object.release",
            caption:
              profile.kind === "sign" ? "咔——挂钩断裂！" : "上方的碎块脱落！",
            pan,
          });
        if (event.type === "impact" && distance(center, this.player) < 360)
          this.hooks.onAudio({
            id: profile.impactSound,
            caption: profile.impactText,
            pan,
          });
        if (event.type === "avoided")
          this.hooks.onToast(
            `你及时离开了${hazard.title}的危险范围。`,
            "success",
          );
      }
      if (
        this.hazards.lethal(hazard, events) &&
        this.elapsedSeconds > this.graceUntil &&
        hazardContact(hazard, this.hazards.state(hazard), this.player)
      ) {
        this.beginDeath(hazard);
        return;
      }
    }
  }
  private beginDeath(hazard: HazardSpec) {
    if (this.dead) return;
    this.dead = true;
    this.paused = true;
    this.cancel();
    this.keys.clear();
    this.hovered = null;
    this.canvas.style.cursor = "default";
    this.deathCount++;
    this.deathScene = {
      hazard,
      age: 0,
      delivered: false,
      info: {
        cause: hazard.title,
        lesson: hazard.lesson,
        sequence: `${hazard.warning} → ${hazardProfile(hazard).impactText}。`,
        time: gameTime(this.level.startTime, this.elapsedSeconds),
      },
    };
    this.persist();
    this.emitView();
    this.hooks.onCinematic?.(true);
    this.hooks.onAudio({ id: "player.death.soft" });
  }
  private updateDeath(delta: number) {
    const scene = this.deathScene;
    if (!scene || scene.delivered || document.hidden) return;
    const previous = scene.age;
    scene.age += delta;
    this.hazards.update(scene.hazard, delta, this.player, false, true);
    if (previous < DEATH_TIMING.soul && scene.age >= DEATH_TIMING.soul)
      this.hooks.onAudio({
        id: "player.soul.rise",
        caption: "一缕小小的灵魂，带着今天的记忆升起",
      });
    if (scene.age >= DEATH_TIMING.dialog) {
      scene.delivered = true;
      this.hooks.onDeath(scene.info);
    }
  }
  private seen(q: Point) {
    return this.explored.has(
      Math.floor(q.y / FOG) * FOG_COLS + Math.floor(q.x / FOG),
    );
  }
  private reveal() {
    const cx = Math.floor(this.player.x / FOG),
      cy = Math.floor(this.player.y / FOG);
    for (let y = Math.max(0, cy - 7); y < Math.min(FOG_ROWS, cy + 8); y++)
      for (let x = Math.max(0, cx - 7); x < Math.min(FOG_COLS, cx + 8); x++)
        if (distance(this.player, p((x + 0.5) * FOG, (y + 0.5) * FOG)) < VISION)
          this.explored.add(y * FOG_COLS + x);
    this.entities.forEach((e) => {
      if (this.visibleEntity(e) && this.seen(e)) this.discovered.add(e.id);
    });
  }
  private draw() {
    const ctx = this.ctx;
    ctx.setTransform(
      this.canvas.width / this.width,
      0,
      0,
      this.canvas.height / this.height,
      0,
      0,
    );
    ctx.fillStyle = this.level.palette.shadow;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    const map = this.mapImage;
    if (map?.complete && map.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(map, 0, 0, 1600, 900);
    }
    this.drawCrossing();
    this.drawScenePatches(ctx);
    this.drawAtmosphere();
    this.activeHazards.forEach((h) => this.drawHazard(h));
    this.footsteps.forEach((f) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.globalAlpha = (f.life / 1.3) * 0.14;
      ctx.fillStyle = "#2b3028";
      ctx.fillRect(-3, -2, 6, 3);
      ctx.restore();
    });
    const actors = [
      ...this.entities
        .filter((e) => this.visibleEntity(e))
        .map((entity) => ({
          y: entityDepth(entity, this.entityPosition(entity)),
          draw: () => this.drawEntity(entity),
        })),
      { y: this.player.y, draw: () => this.drawPlayer() },
      ...this.activeWorld.occluders.map((o) => ({
        y: o.depth,
        draw: () => {
          if (!map?.complete || !map.naturalWidth) return;
          ctx.save();
          ctx.beginPath();
          o.polygon.forEach((p, i) =>
            i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
          );
          ctx.closePath();
          ctx.clip();
          this.redrawWorldBacking(ctx);
          ctx.restore();
        },
      })),
      ...this.activeHazards.map((h) => ({
        y: hazardCenter(h).y,
        draw: () =>
          drawHazardObject(ctx, h, this.hazards.state(h), this.reducedMotion, p => this.nav.isWalkable(p)),
      })),
    ].sort((a, b) => a.y - b.y);
    actors.forEach((actor) => actor.draw());
    if (this.deathScene)
      drawSoul(ctx, this.player, this.deathScene.age, this.reducedMotion);
    if (this.destination && this.destinationAge > 0 && !this.focus) {
      ctx.globalAlpha = (this.destinationAge / 0.65) * 0.7;
      ctx.strokeStyle = "#fff9de";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.destination.x - 4, this.destination.y - 2);
      ctx.lineTo(this.destination.x, this.destination.y + 1);
      ctx.lineTo(this.destination.x + 4, this.destination.y - 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (this.deathScene) {
      const focusX = this.player.x - this.camera.x,
        focusY = this.player.y - this.camera.y - 40;
      const vignette = ctx.createRadialGradient(
        focusX,
        focusY,
        55,
        focusX,
        focusY,
        Math.max(this.width, this.height) * 0.7,
      );
      vignette.addColorStop(0, "#15273600");
      vignette.addColorStop(1, "#152736c9");
      ctx.globalAlpha = clamp(this.deathScene.age / 0.65, 0, 1);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }
    this.drawMinimap();
    if (new URLSearchParams(location.search).has("debug"))
      this.canvas.dataset.state = JSON.stringify({
        level: this.level.id,
        room: this.room?.id ?? null,
        discoveries: [...this.discoveryFlags],
        player: this.player,
        facing: this.facing,
        path: this.path,
        waiting: this.waiting,
        camera: this.camera,
        viewport: { width: this.width, height: this.height },
        hover: this.hovered?.id,
        explored: this.explored.size,
        worldFlags: [...this.worldFlags],
        solved: [...this.solved],
        walkable: this.nav.isWalkable(this.player),
        action: this.pending
          ? {
              id: this.pending.id,
              progress: 1 - this.actionTime / this.actionDuration,
            }
          : null,
        paused: this.paused,
        death: this.deathScene
          ? { stage: deathStage(this.deathScene.age), age: this.deathScene.age }
          : null,
        hazards: this.activeHazards.map((h) => ({
          id: h.id,
          ...this.hazards.state(h),
        })),
      });
  }
  private drawPlayer() {
    if (this.deathScene) {
      this.drawFallenPlayer();
      return;
    }
    const ctx = this.ctx,
      moving = this.path.length > 0 && this.speed > 10,
      phase = (this.stride / 54) * Math.PI * 2;
    const sideAction =
      this.pending && (this.facing === "left" || this.facing === "right");
    const row = sideAction
      ? 3
      : this.facing === "up"
        ? 2
        : this.facing === "left" || this.facing === "right"
          ? 1
          : 0;
    const col = sideAction
      ? 2
      : moving
        ? [1, 2, 3, 2][Math.floor(this.stride / 13.5) % 4]
        : 0;
    const lift =
      moving && !this.reducedMotion ? Math.abs(Math.sin(phase)) * 1.2 : 0;
    ctx.fillStyle = "#162a3048";
    ctx.beginPath();
    ctx.ellipse(this.player.x, this.player.y, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    this.atlas.draw(
      ctx,
      "traveler-v2",
      row * 4 + col,
      this.player.x,
      this.player.y - lift,
      78,
      false,
      this.facing === "left",
      63,
    );
    if (this.pending) {
      ctx.strokeStyle = "#f5e8b8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.player.x - 12, this.player.y - 88);
      ctx.lineTo(
        this.player.x - 12 + 24 * (1 - this.actionTime / this.actionDuration),
        this.player.y - 88,
      );
      ctx.stroke();
      if (this.pending.mechanism?.kind === "breakable") {
        const progress = 1 - this.actionTime / this.actionDuration,
          direction = this.facing === "left" ? -1 : 1;
        ctx.save();
        ctx.translate(this.player.x + direction * 20, this.player.y - 39);
        ctx.rotate(direction * (-0.8 + Math.sin(progress * Math.PI * 6) * 0.8));
        ctx.fillStyle = "#9e734b";
        ctx.fillRect(-2, -23, 4, 25);
        ctx.fillStyle = "#b3c3c5";
        ctx.fillRect(-9, -26, 18, 8);
        ctx.restore();
      }
    }
  }
  private drawFallenPlayer() {
    const scene = this.deathScene!,
      ctx = this.ctx,
      kind = hazardProfile(scene.hazard).kind;
    if (scene.age > 0.85) return;
    const collapse = clamp(scene.age / 0.28, 0, 1);
    const submerged = kind === "water" || kind === "mud";
    ctx.save();
    ctx.globalAlpha = 1 - clamp((scene.age - 0.28) / 0.57, 0, 1);
    ctx.translate(this.player.x, this.player.y);
    if (submerged) {
      ctx.beginPath();
      ctx.rect(-65, -90, 130, 91);
      ctx.clip();
      ctx.translate(0, collapse * 45);
    } else if (!this.reducedMotion) {
      ctx.rotate((this.facing === "left" ? -1 : 1) * collapse * Math.PI * 0.43);
      ctx.scale(1, 1 - collapse * 0.16);
    }
    this.atlas.draw(
      ctx,
      "traveler-v2",
      this.facing === "up"
        ? 8
        : this.facing === "left" || this.facing === "right"
          ? 4
          : 0,
      0,
      0,
      78,
      false,
      this.facing === "left",
      63,
    );
    ctx.restore();
  }
  private drawCrossing() {
    const flags = this.flags();
    for (const surface of this.activeWorld.surfaces)
      if (!surface.requires || flags.has(surface.requires))
        drawSurface(this.ctx, this.sceneRaster, surface);
  }
  private drawEntity(entity: Entity) {
    const ctx = this.ctx,
      pos = this.entityPosition(entity),
      done = this.done(entity);
    const hover = !this.paused && this.hovered?.id === entity.id;
    if (entity.discovery?.animal) {
      const animal = this.critters.get(entity.id);
      ctx.save(); ctx.fillStyle = "rgba(23, 32, 24, 0.2)";
      ctx.beginPath(); ctx.ellipse(pos.x, pos.y - 1, entity.height * .34, entity.height * .1, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.scale(animal?.direction ?? 1, 1);
      this.atlas.draw(ctx, "critters", this.entityFrame(entity), 0, 0, entity.height, hover, false, entity.visual?.maxWidth ?? 48);
      ctx.restore(); return;
    }
    if (entity.discovery?.art) {
      const art = done ? entity.discovery.afterArt : entity.discovery.art;
      if (art) this.sceneRaster.draw(ctx, art, pos, hover);
      return;
    }
    if (entity.mechanism) {
      const controlling =
        this.pending?.id === entity.id ||
        this.pending?.id === entity.mechanism.controlledBy;
      drawMechanism(
        ctx,
        this.sceneRaster,
        entity.mechanism,
        done,
        controlling ? 1 - this.actionTime / this.actionDuration : 0,
        hover,
        this.elapsedSeconds - (this.doneAt.get(entity.id) ?? -99),
        this.reducedMotion,
        () => this.redrawWorldBacking(ctx),
      );
      return;
    }
    if (entity.baked) {
      drawBakedObject(ctx, entity, done, hover, () => this.redrawWorldBacking(ctx));
      return;
    }
    let y = pos.y;
    if ((entity.id === "bee" || entity.id === "bat") && !this.reducedMotion)
      y += Math.sin(this.elapsedSeconds * 5) * 2;
    drawPlacedSprite(ctx, this.atlas, entity, {x: pos.x, y}, this.entityFrame(entity), hover, this.level.environment);
    if (
      done &&
      entity.type === "puzzle" &&
      /signal|breaker|lamp|lights|lock|door/.test(entity.id)
    ) {
      ctx.fillStyle = "#b9ffb3";
      ctx.fillRect(pos.x - 2, pos.y - entity.height + 9, 4, 3);
    }
    const age = this.elapsedSeconds - (this.doneAt.get(entity.id) ?? -99);
    if (done && age < 1.2 && !this.reducedMotion) {
      ctx.globalAlpha = 1 - age / 1.2;
      ctx.fillStyle = this.level.palette.accentSoft;
      for (let i = 0; i < 5; i++) {
        const angle = i * Math.PI * 0.4;
        ctx.fillRect(
          pos.x + Math.cos(angle) * age * 20,
          pos.y - entity.height * 0.5 + Math.sin(angle) * age * 16 - age * 15,
          2,
          2,
        );
      }
      ctx.globalAlpha = 1;
    }
  }
  private drawScenePatches(ctx: CanvasRenderingContext2D) {
    for (const entity of this.entities)
      if (entity.discovery?.afterArt && entity.baked && this.done(entity)) this.sceneRaster.draw(ctx, entity.discovery.afterArt, entity);
    for (const entity of this.entities)
      if (entity.mechanism && this.visibleEntity(entity)) {
        const age = this.elapsedSeconds - (this.doneAt.get(entity.mechanism.controlledBy ?? entity.id) ?? -99);
        drawMechanismPatch(ctx, this.sceneRaster, entity.mechanism, this.done(entity),
          this.reducedMotion ? 1 : age / 0.3);
      }
  }
  private redrawWorldBacking(ctx: CanvasRenderingContext2D) {
    const map = this.mapImage, flags = this.flags();
    if (map?.complete && map.naturalWidth) ctx.drawImage(map, 0, 0, 1600, 900);
    for (const surface of this.activeWorld.surfaces)
      if (!surface.requires || flags.has(surface.requires)) drawSurface(ctx, this.sceneRaster, surface);
    this.drawScenePatches(ctx);
  }
  private drawHazard(h: HazardSpec) {
    drawHazardGround(this.ctx, h, this.hazards.state(h), {
      assist: this.dangerAssist,
      reduced: this.reducedMotion,
      time: this.elapsedSeconds,
    });
  }
  private drawAtmosphere() {
    if (this.room) return;
    if (this.reducedMotion) return;
    const ctx = this.ctx,
      t = this.elapsedSeconds;
    const rain = /rain-city|storm-mountain/.test(this.level.environment),
      snow = this.level.environment === "snow-station";
    ctx.save();
    ctx.globalAlpha = rain ? 0.14 : 0.55;
    ctx.fillStyle = snow ? "#ffffff" : "#fffbd2";
    ctx.strokeStyle = "#d1ebf8";
    ctx.lineWidth = 1;
    for (let i = 0; i < (rain ? 65 : 18); i++) {
      const x = (i * 131.4 + t * (rain ? -15 : 8) + 1600) % 1600,
        y = (i * 71.8 + t * (rain ? 160 : snow ? 18 : -5) + 900) % 900;
      if (rain) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 13);
        ctx.stroke();
      } else if (
        snow ||
        ["flower-valley", "glow-cave", "autumn-river"].includes(
          this.level.environment,
        )
      )
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.restore();
  }
  private drawMinimap() {
    const ctx = this.miniContext,
      w = this.minimap.width,
      h = this.minimap.height,
      map = this.mapImage;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#142b33";
    ctx.fillRect(0, 0, w, h);
    if (map?.complete && map.naturalWidth) ctx.drawImage(map, 0, 0, w, h);
    const sx = w / 1600,
      sy = h / 900;
    ctx.save();
    ctx.scale(sx, sy);
    for (const surface of this.activeWorld.surfaces)
      if (!surface.requires || this.flags().has(surface.requires))
        drawSurface(ctx, this.sceneRaster, surface);
    for (const entity of this.entities)
      if (entity.mechanism && this.visibleEntity(entity))
        { drawMechanismPatch(ctx, this.sceneRaster, entity.mechanism, this.done(entity));
          drawMechanism(ctx, this.sceneRaster, entity.mechanism, this.done(entity), 0, false, 99, true); }
    ctx.restore();
    for (let y = 0; y < FOG_ROWS; y++)
      for (let x = 0; x < FOG_COLS; x++) {
        const q = p((x + 0.5) * FOG, (y + 0.5) * FOG);
        ctx.fillStyle = !this.explored.has(y * FOG_COLS + x)
          ? "#10232b"
          : distance(q, this.player) > VISION
            ? "#14252c85"
            : "#112a3020";
        ctx.fillRect(
          x * FOG * sx,
          y * FOG * sy,
          Math.ceil(FOG * sx),
          Math.ceil(FOG * sy),
        );
      }
    this.entities.forEach((entity) => {
      if (!this.visibleEntity(entity) || !this.discovered.has(entity.id))
        return;
      const pos = this.entityPosition(entity);
      ctx.fillStyle = this.done(entity)
        ? "#a2d3b1"
        : entity.type === "side"
          ? "#9ddbcf"
          : "#f4da88";
      ctx.fillRect(pos.x * sx - 1.5, pos.y * sy - 1.5, 3, 3);
    });
    this.activeHazards.forEach((hazard) => {
      const center = p(
        hazard.rect.x + hazard.rect.width / 2,
        hazard.rect.y + hazard.rect.height / 2,
      );
      if (
        this.phase(hazard) === "safe" ||
        !this.seen(center) ||
        distance(center, this.player) > 280
      )
        return;
      ctx.fillStyle = this.phase(hazard) === "active" ? "#ff8b78" : "#ffe19d";
      ctx.beginPath();
      ctx.moveTo(center.x * sx, center.y * sy - 4);
      ctx.lineTo(center.x * sx - 3, center.y * sy + 3);
      ctx.lineTo(center.x * sx + 3, center.y * sy + 3);
      ctx.closePath();
      ctx.fill();
    });
    if (this.markedUntil > this.elapsedSeconds) {
      const target =
        (this.room ? this.entities.find(e => e.discovery && !this.done(e)) ?? this.activeWorld.exit : undefined) ?? this.accessMechanism(this.currentPuzzle()?.id)?.position ??
        this.currentPuzzle()?.position ??
        this.level.exit;
      ctx.strokeStyle = "#ffe2a0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(target.x * sx, target.y * sy, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "#eff8ec77";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      this.camera.x * sx,
      this.camera.y * sy,
      this.width * sx,
      this.height * sy,
    );
    if (this.destination) {
      ctx.strokeStyle = "#e6f4ce88";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(this.player.x * sx, this.player.y * sy);
      this.path.forEach((q) => ctx.lineTo(q.x * sx, q.y * sy));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.save();
    ctx.translate(this.player.x * sx, this.player.y * sy);
    ctx.rotate(
      { down: Math.PI, right: -Math.PI / 2, up: 0, left: Math.PI / 2 }[
        this.facing
      ],
    );
    ctx.fillStyle = "#fff7d3";
    ctx.strokeStyle = "#253c46";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const label = document.getElementById("regionName");
    if (label) label.textContent = this.nav.regionAt(this.player);
  }
  private persist() {
    if (!this.started) return;
    if (this.room) this.roomExplored[this.room.id] = [...this.explored];
    this.save.levels[this.level.id] = {
      solved: [...this.solved],
      sideTasks: [...this.sideTasks],
      hintsUsed: this.hintCount,
      deaths: this.deathCount,
      explored: [...(this.room ? this.outsideExplored : this.explored)],
      discoveries: [...this.discoveryFlags],
      visitedRooms: [...this.visitedRooms],
      roomExplored: this.roomExplored,
      checkpoint: { ...this.checkpoint },
      hintStages: { ...this.hintStages },
      layoutRevision: LAYOUT_REVISION,
      worldFlags: [...this.worldFlags],
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      this.hooks.onToast("本地存储不可用，本次进度暂留在内存中。");
    }
  }
  private loadSave(): CampaignSave {
    try {
      return restoreCampaignSave(JSON.parse(localStorage.getItem(SAVE_KEY) ?? "null"));
    } catch {
      return restoreCampaignSave(null);
    }
  }
}
