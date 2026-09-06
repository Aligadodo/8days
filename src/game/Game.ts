import { ACHIEVEMENTS, CLUES, DISCOVERIES, ITEMS, ITEM_ORDER, PASSCODE, VIEWPORT, WORLD } from "./content";
import type { DeathInfo, Direction, GameHooks, ItemId, TaskView, ViewState } from "./types";

type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };
type Flower = Point & { color: string; size: number };
type TerrainDetail = Point & { variant: number };
type GridCell = { col: number; row: number };

interface PersistedState {
  clues: number[];
  discoveries: string[];
  achievements: string[];
  sideActions: string[];
  deaths: number;
  completed: boolean;
  dangerAssist: boolean;
  reducedMotion: boolean;
}

const SAVE_KEY = "one-more-day:flower-valley:v1";
const PLAYER_SIZE = { w: 26, h: 34 };
const NAV_CELL = 32;
const INTERACTION_DISTANCE = 72;
const RENDER_SCALE = 2;

const BUILDINGS: Rect[] = [
  { x: 88, y: 520, w: 310, h: 224 },
  { x: 1264, y: 34, w: 272, h: 202 },
];

const MOUND: Rect = { x: 990, y: 402, w: 142, h: 66 };
const WIND_ZONE: Rect = { x: 720, y: 250, w: 330, h: 112 };
const BRANCH_ZONE: Rect = { x: 1058, y: 535, w: 126, h: 104 };
const SCENERY_COLLIDERS: Rect[] = [
  { x: 736, y: 712, w: 70, h: 45 },
  { x: 784, y: 816, w: 62, h: 44 },
  { x: 1204, y: 378, w: 124, h: 40 },
];

const INTERACTION_POINTS: Record<string, Point> = {
  mill: { x: 414, y: 728 },
  trowel: { x: 326, y: 824 },
  postcard: { x: 674, y: 532 },
  picnic: { x: 904, y: 724 },
  windpost: { x: 786, y: 380 },
  mound: { x: 1054, y: 477 },
  flowers: { x: 1172, y: 336 },
  cottage: { x: 1398, y: 252 },
  waystone: { x: 692, y: 620 },
  bench: { x: 770, y: 730 },
  spring: { x: 815, y: 845 },
  hive: { x: 1250, y: 402 },
  dandelion: { x: 382, y: 858 },
  frog: { x: 675, y: 650 },
  snail: { x: 900, y: 230 },
  butterfly: { x: 1185, y: 465 },
  cloudview: { x: 1480, y: 300 },
};

type InteractionKind = "story" | "utility" | "optional" | "discovery";

const INTERACTION_KINDS: Record<string, InteractionKind> = {
  mill: "story", trowel: "utility", postcard: "story", picnic: "story", windpost: "utility",
  mound: "utility", flowers: "story", cottage: "story", waystone: "optional", bench: "optional",
  spring: "utility", hive: "optional", dandelion: "discovery", frog: "discovery", snail: "discovery",
  butterfly: "discovery", cloudview: "discovery",
};

const SIGNAL_COLORS: Record<InteractionKind, string> = {
  story: "#fff1a0",
  utility: "#8ee9f2",
  optional: "#a8f0b5",
  discovery: "#ffacd0",
};

const TRAIL_POINTS: Point[] = [
  { x: 150, y: 830 }, { x: 322, y: 822 }, { x: 432, y: 734 }, { x: 432, y: 610 }, { x: 520, y: 535 }, { x: 682, y: 535 },
  { x: 890, y: 715 }, { x: 1080, y: 600 }, { x: 1050, y: 455 }, { x: 1180, y: 334 }, { x: 1395, y: 252 },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function inside(point: Point, rect: Rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly hooks: GameHooks;
  private readonly keys = new Set<string>();
  private readonly virtualKeys = new Set<Direction>();
  private readonly flowers: Flower[];
  private readonly trees: Point[];
  private readonly terrainDetails: TerrainDetail[];
  private lastFrame = performance.now();
  private lastViewUpdate = 0;
  private elapsed = 0;
  private paused = true;
  private selectedSlot = 0;
  private inventory = new Set<ItemId>(["journal"]);
  private clues = new Set<number>();
  private discoveries = new Set<string>();
  private achievements = new Set<string>();
  private sideActions = new Set<string>();
  private deaths = 0;
  private completed = false;
  private dangerAssist = false;
  private reducedMotion = false;
  private player = { x: 166, y: 800, ...PLAYER_SIZE, direction: "down" as Direction };
  private camera = { x: 0, y: 510 };
  private moundCleared = false;
  private flowersWatered = false;
  private windTied = false;
  private branchTriggeredAt: number | null = null;
  private branchFallen = false;
  private currentInteraction: string | null = null;
  private lastDangerNotice = "";
  private navigationPath: Point[] = [];
  private navigationTarget: Point | null = null;
  private pendingInteraction: string | null = null;
  private hoveredInteraction: string | null = null;
  private pointer = { x: 0, y: 0, visible: false, holding: false };
  private lastPointerRouteAt = 0;
  private isMoving = false;

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available");
    this.ctx = context;
    this.canvas.width = VIEWPORT.width * RENDER_SCALE;
    this.canvas.height = VIEWPORT.height * RENDER_SCALE;
    this.ctx.imageSmoothingEnabled = false;
    const persisted = this.load();
    this.clues = new Set(persisted.clues);
    this.discoveries = new Set(persisted.discoveries);
    this.achievements = new Set(persisted.achievements);
    this.sideActions = new Set(persisted.sideActions);
    this.deaths = persisted.deaths;
    this.completed = persisted.completed;
    this.dangerAssist = persisted.dangerAssist;
    this.reducedMotion = persisted.reducedMotion;
    this.flowers = this.createFlowers();
    this.trees = this.createTrees();
    this.terrainDetails = this.createTerrainDetails();
    this.bindKeyboard();
    this.bindPointer();
    this.emitView();
    requestAnimationFrame(this.loop);
  }

  start() {
    this.paused = false;
    this.lastFrame = performance.now();
    this.hooks.onMessage("先去水磨坊看看。闪光的地方值得调查。");
    this.emitView();
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.keys.clear();
    this.virtualKeys.clear();
    this.pointer.holding = false;
  }

  setMovement(direction: Direction, active: boolean) {
    if (active) this.virtualKeys.add(direction);
    else this.virtualKeys.delete(direction);
  }

  selectSlot(index: number) {
    this.selectedSlot = clamp(index, 0, ITEM_ORDER.length - 1);
    const id = ITEM_ORDER[this.selectedSlot];
    if (this.inventory.has(id)) this.hooks.onMessage(`已选择：${ITEMS[id].name}`);
    this.emitView();
  }

  useSelected() {
    if (this.paused) return;
    const id = ITEM_ORDER[this.selectedSlot];
    if (!this.inventory.has(id)) {
      this.hooks.onMessage("这个格子还是空的。");
      return;
    }
    const nearby = this.nearestInteraction();
    if (nearby && ["windpost", "mound", "flowers", "cottage"].includes(nearby)) {
      this.interact();
      return;
    }
    const descriptions: Record<ItemId, string> = {
      journal: "图鉴里夹着四个空白的位置。",
      ribbon: "丝带在风里轻轻飘动。也许应该系到高处。",
      trowel: "小铲适合清理松软的土堆。",
      water: "水壶里只剩一点水。",
      key: "钥匙上刻着一朵很小的花。",
    };
    this.hooks.onMessage(descriptions[id]);
  }

  interact(requestedId?: string) {
    if (this.paused) return;
    const id = requestedId && distance(this.playerCenter(), INTERACTION_POINTS[requestedId]) <= INTERACTION_DISTANCE
      ? requestedId
      : this.nearestInteraction();
    if (!id) {
      this.hooks.onMessage("这里没有需要调查的东西。四处走走看吧。");
      return;
    }

    switch (id) {
      case "mill":
        this.collectClue(0);
        break;
      case "trowel":
        if (this.inventory.has("trowel")) this.hooks.onMessage("旧木箱已经空了。");
        else {
          this.addItem("trowel");
          this.hooks.onMessage("获得小铲。它可以清理上山路边的土堆。");
        }
        break;
      case "postcard":
        this.collectClue(2);
        break;
      case "picnic":
        if (!this.clues.has(1)) this.collectClue(1);
        this.addItem("ribbon");
        this.addItem("water");
        this.hooks.onMessage("收好了一条红丝带和半壶水。没有拿走别人的面包。");
        break;
      case "windpost":
        if (this.windTied) this.hooks.onMessage("丝带清楚地显示着阵风方向。");
        else if (this.inventory.has("ribbon")) {
          this.windTied = true;
          this.hooks.onMessage(`把丝带系好了。风来之前，它会先绷直。${this.awardAchievements("wind_reader")}`);
        } else this.hooks.onMessage("光秃秃的风向杆很难看清。也许可以系点醒目的东西。");
        break;
      case "mound":
        if (this.moundCleared) this.hooks.onMessage("通往上层花田的小路已经清开了。");
        else if (this.inventory.has("trowel")) {
          this.moundCleared = true;
          this.hooks.onMessage("用小铲清开了松土，一条花田捷径出现了。");
        } else this.hooks.onMessage("泥土很松，但徒手挖不开。水磨坊附近也许有工具。");
        break;
      case "flowers":
        if (this.flowersWatered) this.hooks.onMessage("小花重新抬起头，钥匙在叶片间闪光。");
        else if (this.inventory.has("water")) {
          this.flowersWatered = true;
          this.inventory.delete("water");
          this.addItem("key");
          this.hooks.onMessage(`把最后一点水留给了小花。获得黄铜钥匙。${this.awardAchievements("kindness")}`);
        } else this.hooks.onMessage("花瓣已经卷起来了。它们需要一点干净的水。");
        break;
      case "cottage":
        if (!this.clues.has(3)) {
          this.collectClue(3);
          return;
        }
        if (!this.inventory.has("key")) {
          this.hooks.onMessage("门锁着。钥匙也许藏在花田真正需要照顾的地方。");
          return;
        }
        if (this.clues.size < CLUES.length) {
          this.hooks.onMessage(`门上的四个图案还缺 ${CLUES.length - this.clues.size} 个答案。`);
          return;
        }
        this.paused = true;
        this.hooks.onCodeRequest();
        break;
      case "waystone":
        this.sideActions.add("waystone");
        this.hooks.onMessage(`旧路标：← 水磨坊 · ↑ 风口 · → 花田。${this.awardAchievements("wayfinder")}`);
        break;
      case "bench":
        this.sideActions.add("bench");
        this.hooks.onMessage(`你坐了一会儿。河水走得很快，但下午没有。${this.awardAchievements("slow_afternoon")}`);
        break;
      case "spring":
        if (this.inventory.has("water")) this.hooks.onMessage("水壶已经装满了。泉水很凉，留一点给后来的人。");
        else {
          this.addItem("water");
          this.hooks.onMessage("在石泉装了一壶干净的水。这里是水壶的另一种补给方式。");
        }
        break;
      case "hive":
        if (!this.flowersWatered) this.hooks.onMessage("蜂箱很安静。蜜蜂在等花田重新有水。");
        else {
          this.sideActions.add("hive");
          this.hooks.onMessage(`花开后，蜜蜂终于沿着金色小路飞回蜂箱。${this.awardAchievements("hive_keeper")}`);
        }
        break;
      default:
        if (DISCOVERIES.some((discovery) => discovery.id === id)) this.observeDiscovery(id);
        break;
    }
    this.refreshProgressAchievements();
    this.save();
    this.emitView();
  }

  submitCode(value: string) {
    if (value !== PASSCODE) {
      this.hooks.onMessage("顺序不对。看看日志里四个图案的排列。");
      return false;
    }
    this.completed = true;
    this.awardAchievements("remembered_day");
    if (["waystone", "bench", "hive"].every((task) => this.sideActions.has(task))) this.awardAchievements("unhurried_day");
    this.save();
    this.hooks.onComplete();
    this.emitView();
    return true;
  }

  cancelCode() {
    this.paused = false;
  }

  restart() {
    this.inventory = new Set<ItemId>(["journal"]);
    this.selectedSlot = 0;
    this.player = { x: 166, y: 800, ...PLAYER_SIZE, direction: "down" };
    this.camera = { x: 0, y: 510 };
    this.elapsed = 0;
    this.moundCleared = false;
    this.flowersWatered = false;
    this.windTied = false;
    this.branchTriggeredAt = null;
    this.branchFallen = false;
    this.cancelNavigation();
    this.paused = false;
    this.lastFrame = performance.now();
    this.hooks.onMessage("你记得发生过的事。这一次，慢一点。");
    this.emitView();
  }

  manualSave() {
    this.save();
    this.hooks.onMessage("生活日志已保存在这台设备上。");
  }

  setDangerAssist(enabled: boolean) {
    this.dangerAssist = enabled;
    this.save();
    this.emitView();
  }

  setReducedMotion(enabled: boolean) {
    this.reducedMotion = enabled;
    this.save();
    this.emitView();
  }

  getViewState(): ViewState {
    const minutes = Math.floor(this.elapsed / 10);
    const hour = 9 + Math.floor((10 + minutes) / 60);
    const minute = (10 + minutes) % 60;
    return {
      time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      objective: this.objective(),
      interaction: this.currentInteraction,
      inventory: ITEM_ORDER.filter((item) => this.inventory.has(item)),
      selectedSlot: this.selectedSlot,
      clues: [...this.clues].sort(),
      tasks: this.taskViews(),
      discoveries: [...this.discoveries],
      achievements: [...this.achievements],
      deaths: this.deaths,
      completed: this.completed,
      dangerAssist: this.dangerAssist,
      reducedMotion: this.reducedMotion,
    };
  }

  private bindKeyboard() {
    window.addEventListener("keydown", (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      const key = event.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        this.cancelNavigation();
        this.keys.add(key);
      }
      if (!event.repeat && (key === "e" || key === " ")) {
        event.preventDefault();
        this.interact();
      }
      if (!event.repeat && key === "f") this.useSelected();
      if (/^[1-5]$/.test(key)) this.selectSlot(Number(key) - 1);
      if (!event.repeat && key === "r" && !this.paused) this.restart();
    });
    window.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.virtualKeys.clear();
    });
  }

  private bindPointer() {
    const updatePointer = (event: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const screenX = (event.clientX - rect.left) / rect.width * VIEWPORT.width;
      const screenY = (event.clientY - rect.top) / rect.height * VIEWPORT.height;
      this.pointer.x = clamp(screenX + this.camera.x, 0, WORLD.width);
      this.pointer.y = clamp(screenY + this.camera.y, 0, WORLD.height);
      this.pointer.visible = true;
      this.hoveredInteraction = this.interactionAt(this.pointer, 48);
      this.canvas.style.cursor = this.hoveredInteraction ? "pointer" : "crosshair";
    };

    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || this.paused) return;
      event.preventDefault();
      updatePointer(event);
      this.pointer.holding = true;
      this.canvas.setPointerCapture(event.pointerId);
      if (this.hoveredInteraction) this.queueInteraction(this.hoveredInteraction);
      else this.navigateTo(this.pointer);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      updatePointer(event);
      if (!this.pointer.holding || this.paused || performance.now() - this.lastPointerRouteAt < 90) return;
      this.lastPointerRouteAt = performance.now();
      this.pendingInteraction = null;
      this.navigateTo(this.pointer, false);
    });
    this.canvas.addEventListener("pointerup", (event) => {
      this.pointer.holding = false;
      if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointercancel", () => { this.pointer.holding = false; });
    this.canvas.addEventListener("pointerleave", () => {
      if (!this.pointer.holding) {
        this.pointer.visible = false;
        this.hoveredInteraction = null;
        this.canvas.style.cursor = "default";
      }
    });
    this.canvas.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.cancelNavigation();
      this.hooks.onMessage("已取消移动。");
    });
  }

  private readonly loop = (now: number) => {
    const dt = Math.min((now - this.lastFrame) / 1000, 0.033);
    this.lastFrame = now;
    if (!this.paused) this.update(dt, now);
    this.draw(now);
    requestAnimationFrame(this.loop);
  };

  private update(dt: number, now: number) {
    this.elapsed += dt;
    let x = 0;
    let y = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft") || this.virtualKeys.has("left")) x -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright") || this.virtualKeys.has("right")) x += 1;
    if (this.keys.has("w") || this.keys.has("arrowup") || this.virtualKeys.has("up")) y -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown") || this.virtualKeys.has("down")) y += 1;
    this.isMoving = false;
    if (x || y) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
      const speed = 168;
      if (Math.abs(x) > Math.abs(y)) this.player.direction = x > 0 ? "right" : "left";
      else this.player.direction = y > 0 ? "down" : "up";
      this.tryMove(x * speed * dt, 0);
      this.tryMove(0, y * speed * dt);
      this.isMoving = true;
    } else {
      this.followNavigation(dt);
    }

    this.camera.x += (clamp(this.player.x - VIEWPORT.width / 2, 0, WORLD.width - VIEWPORT.width) - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (clamp(this.player.y - VIEWPORT.height / 2, 0, WORLD.height - VIEWPORT.height) - this.camera.y) * Math.min(1, dt * 5);
    this.updateHazards(now);
    this.currentInteraction = this.interactionLabel(this.hoveredInteraction ?? this.nearestInteraction());
    if (now - this.lastViewUpdate > 120) {
      this.lastViewUpdate = now;
      this.emitView();
    }
  }

  private followNavigation(dt: number) {
    while (this.navigationPath.length && distance(this.playerCenter(), this.navigationPath[0]) < 5) {
      this.navigationPath.shift();
    }
    const waypoint = this.navigationPath[0];
    if (waypoint) {
      const center = this.playerCenter();
      const dx = waypoint.x - center.x;
      const dy = waypoint.y - center.y;
      const length = Math.hypot(dx, dy);
      const speed = 178;
      const step = Math.min(length, speed * dt);
      const moveX = dx / length * step;
      const moveY = dy / length * step;
      if (Math.abs(moveX) > Math.abs(moveY)) this.player.direction = moveX > 0 ? "right" : "left";
      else this.player.direction = moveY > 0 ? "down" : "up";
      const before = this.playerCenter();
      this.tryMove(moveX, 0);
      this.tryMove(0, moveY);
      this.isMoving = distance(before, this.playerCenter()) > 0.1;
      if (!this.isMoving) this.cancelNavigation();
      return;
    }

    if (this.navigationTarget) this.navigationTarget = null;
    if (this.pendingInteraction) {
      const id = this.pendingInteraction;
      this.pendingInteraction = null;
      this.interact(id);
    }
  }

  private navigateTo(destination: Point, announceFailure = true) {
    const route = this.findPath(this.playerCenter(), destination);
    if (!route.length) {
      if (announceFailure) this.hooks.onMessage("那里走不过去，换个位置试试。");
      this.navigationPath = [];
      this.navigationTarget = null;
      this.pendingInteraction = null;
      return;
    }
    this.navigationPath = route;
    this.navigationTarget = route[route.length - 1];
  }

  private queueInteraction(id: string) {
    const point = INTERACTION_POINTS[id];
    if (distance(this.playerCenter(), point) <= INTERACTION_DISTANCE) {
      this.cancelNavigation();
      this.interact(id);
      return;
    }
    this.pendingInteraction = id;
    this.navigateTo(point);
  }

  private cancelNavigation() {
    this.navigationPath = [];
    this.navigationTarget = null;
    this.pendingInteraction = null;
  }

  private interactionAt(point: Point, radius: number) {
    let nearest: string | null = null;
    let nearestDistance = radius;
    for (const [id, target] of Object.entries(INTERACTION_POINTS)) {
      const d = distance(point, target);
      if (d < nearestDistance) {
        nearest = id;
        nearestDistance = d;
      }
    }
    return nearest;
  }

  private findPath(start: Point, destination: Point): Point[] {
    const startCell = this.nearestWalkableCell(start);
    const goalCell = this.nearestWalkableCell(destination);
    if (!startCell || !goalCell) return [];

    const cols = Math.ceil(WORLD.width / NAV_CELL);
    const rows = Math.ceil(WORLD.height / NAV_CELL);
    const cellKey = (cell: GridCell) => `${cell.col},${cell.row}`;
    const goalKey = cellKey(goalCell);
    const open: Array<GridCell & { f: number }> = [{ ...startCell, f: 0 }];
    const costs = new Map<string, number>([[cellKey(startCell), 0]]);
    const parents = new Map<string, string>();
    const cells = new Map<string, GridCell>([[cellKey(startCell), startCell]]);
    const visited = new Set<string>();
    const directions = [-1, 0, 1].flatMap((row) => [-1, 0, 1].map((col) => ({ col, row }))).filter(({ col, row }) => col || row);

    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const current = open.shift()!;
      const currentKey = cellKey(current);
      if (visited.has(currentKey)) continue;
      if (currentKey === goalKey) {
        const path: Point[] = [];
        let key: string | undefined = currentKey;
        while (key && key !== cellKey(startCell)) {
          const cell = cells.get(key)!;
          path.unshift(this.cellCenter(cell));
          key = parents.get(key);
        }
        if (!path.length) path.push(this.cellCenter(goalCell));
        return this.simplifyPath(path);
      }
      visited.add(currentKey);

      for (const direction of directions) {
        const next = { col: current.col + direction.col, row: current.row + direction.row };
        if (next.col < 0 || next.row < 0 || next.col >= cols || next.row >= rows || !this.cellIsWalkable(next)) continue;
        if (direction.col && direction.row) {
          if (!this.cellIsWalkable({ col: current.col + direction.col, row: current.row }) || !this.cellIsWalkable({ col: current.col, row: current.row + direction.row })) continue;
        }
        const nextKey = cellKey(next);
        const moveCost = direction.col && direction.row ? 1.414 : 1;
        const cost = (costs.get(currentKey) ?? Infinity) + moveCost;
        if (cost >= (costs.get(nextKey) ?? Infinity)) continue;
        costs.set(nextKey, cost);
        parents.set(nextKey, currentKey);
        cells.set(nextKey, next);
        const heuristic = Math.hypot(goalCell.col - next.col, goalCell.row - next.row);
        open.push({ ...next, f: cost + heuristic });
      }
    }
    return [];
  }

  private nearestWalkableCell(point: Point): GridCell | null {
    const origin = {
      col: clamp(Math.floor(point.x / NAV_CELL), 0, Math.ceil(WORLD.width / NAV_CELL) - 1),
      row: clamp(Math.floor(point.y / NAV_CELL), 0, Math.ceil(WORLD.height / NAV_CELL) - 1),
    };
    let best: GridCell | null = null;
    let bestDistance = Infinity;
    for (let radius = 0; radius <= 5; radius += 1) {
      for (let row = origin.row - radius; row <= origin.row + radius; row += 1) {
        for (let col = origin.col - radius; col <= origin.col + radius; col += 1) {
          const cell = { col, row };
          if (!this.cellIsWalkable(cell)) continue;
          const d = distance(point, this.cellCenter(cell));
          if (d < bestDistance) {
            best = cell;
            bestDistance = d;
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  private cellCenter(cell: GridCell) {
    return { x: cell.col * NAV_CELL + NAV_CELL / 2, y: cell.row * NAV_CELL + NAV_CELL / 2 };
  }

  private cellIsWalkable(cell: GridCell) {
    const center = this.cellCenter(cell);
    return !this.isBlocked({ x: center.x - PLAYER_SIZE.w / 2, y: center.y - PLAYER_SIZE.h / 2, ...PLAYER_SIZE });
  }

  private simplifyPath(path: Point[]) {
    if (path.length < 3) return path;
    return path.filter((point, index) => {
      if (index === 0 || index === path.length - 1) return true;
      const previous = path[index - 1];
      const next = path[index + 1];
      return Math.sign(point.x - previous.x) !== Math.sign(next.x - point.x) || Math.sign(point.y - previous.y) !== Math.sign(next.y - point.y);
    });
  }

  private tryMove(dx: number, dy: number) {
    const next = { x: this.player.x + dx, y: this.player.y + dy, w: this.player.w, h: this.player.h };
    if (!this.isBlocked(next)) {
      this.player.x = next.x;
      this.player.y = next.y;
    }
  }

  private isBlocked(player: Rect) {
    if (player.x < 20 || player.y < 20 || player.x + player.w > WORLD.width - 20 || player.y + player.h > WORLD.height - 20) return true;
    if (BUILDINGS.some((rect) => overlaps(player, rect))) return true;
    if (SCENERY_COLLIDERS.some((rect) => overlaps(player, rect))) return true;
    if (this.trees.some((tree) => overlaps(player, { x: tree.x - 14, y: tree.y + 34, w: 28, h: 58 }))) return true;
    if (!this.moundCleared && overlaps(player, MOUND)) return true;

    const center = { x: player.x + player.w / 2, y: player.y + player.h / 2 };
    const riverCenter = this.riverCenter(center.y);
    const onBridge = center.y >= 496 && center.y <= 566;
    if (!onBridge && Math.abs(center.x - riverCenter) < 69) return true;
    return false;
  }

  private updateHazards(now: number) {
    const center = this.playerCenter();
    const windPhase = this.elapsed % 8;
    const windWarning = windPhase >= 5.35 && windPhase < 6.7;
    const windActive = windPhase >= 6.7;
    if (inside(center, WIND_ZONE) && windWarning && this.lastDangerNotice !== "wind") {
      this.lastDangerNotice = "wind";
      this.hooks.onMessage(this.windTied ? "丝带突然绷直——阵风要来了！" : "整片花都弯下去了……快离开风口！");
    }
    if (!windWarning && !windActive && this.lastDangerNotice === "wind") this.lastDangerNotice = "";
    if (inside(center, WIND_ZONE) && windActive && !this.windTied) {
      this.die({
        time: this.getViewState().time,
        cause: "阵风把你吹下了花田边坡",
        lesson: "风来之前，整片花会先弯下。系好丝带，或在阵风期间绕开高处。",
      });
      return;
    }

    if (!this.branchFallen && this.branchTriggeredAt === null && inside(center, BRANCH_ZONE)) {
      this.branchTriggeredAt = now;
      this.hooks.onMessage("树上传来一声轻响，地面的阴影正在变大！");
    }
    if (this.branchTriggeredAt !== null && !this.branchFallen && now - this.branchTriggeredAt > 1050) {
      if (inside(center, BRANCH_ZONE)) {
        this.die({
          time: this.getViewState().time,
          cause: "枯枝落在了经过的小路上",
          lesson: "听到树枝断裂声后，立刻离开不断扩大的阴影区域。",
        });
        return;
      }
      this.branchFallen = true;
    }
  }

  private die(info: DeathInfo) {
    if (this.paused) return;
    this.deaths += 1;
    this.paused = true;
    if (this.deaths >= 3) this.dangerAssist = true;
    this.save();
    this.hooks.onDeath(info);
    this.emitView();
  }

  private nearestInteraction() {
    const player = this.playerCenter();
    let nearest: string | null = null;
    let nearestDistance = INTERACTION_DISTANCE;
    for (const [id, point] of Object.entries(INTERACTION_POINTS)) {
      const d = distance(player, point);
      if (d < nearestDistance) {
        nearest = id;
        nearestDistance = d;
      }
    }
    return nearest;
  }

  private interactionLabel(id: string | null) {
    if (!id) return null;
    const labels: Record<string, string> = {
      mill: this.clues.has(0) ? "点击 / E 再看旧门牌" : "点击 / E 调查旧磨坊门牌",
      trowel: this.inventory.has("trowel") ? "点击 / E 查看空木箱" : "点击 / E 拾取小铲",
      postcard: this.clues.has(2) ? "点击 / E 阅读明信片" : "点击 / E 拾起发光的明信片",
      picnic: this.clues.has(1) ? "点击 / E 查看野餐地" : "点击 / E 调查野餐便笺",
      windpost: "点击 / E 调查风向杆",
      mound: this.moundCleared ? "点击 / E 查看清开的路" : "点击 / E 清理土堆",
      flowers: "点击 / E 照料枯萎的小花",
      cottage: this.clues.has(3) ? "点击 / E 尝试打开小屋" : "点击 / E 调查山顶门牌",
      waystone: this.sideActions.has("waystone") ? "点击 / E 重读旧路标" : "点击 / E 读懂旧路标",
      bench: this.sideActions.has("bench") ? "点击 / E 再坐一会儿" : "点击 / E 在河边长椅休息",
      spring: this.inventory.has("water") ? "点击 / E 看看清泉" : "点击 / E 装一壶泉水",
      hive: this.sideActions.has("hive") ? "点击 / E 听蜂箱的嗡鸣" : "点击 / E 查看安静的蜂箱",
      dandelion: this.discoveryLabel("dandelion"),
      frog: this.discoveryLabel("frog"),
      snail: this.discoveryLabel("snail"),
      butterfly: this.discoveryLabel("butterfly"),
      cloudview: this.discoveryLabel("cloudview"),
    };
    return labels[id];
  }

  private discoveryLabel(id: string) {
    const discovery = DISCOVERIES.find((entry) => entry.id === id);
    if (!discovery) return "点击 / E 观察";
    return this.discoveries.has(id) ? `点击 / E 重看「${discovery.title}」` : `点击 / E 观察「${discovery.title}」`;
  }

  private observeDiscovery(id: string) {
    const discovery = DISCOVERIES.find((entry) => entry.id === id);
    if (!discovery) return;
    if (this.discoveries.has(id)) {
      this.hooks.onMessage(`${discovery.icon} ${discovery.title}：${discovery.note}`);
      return;
    }
    this.discoveries.add(id);
    const thresholdAchievements: string[] = [];
    if (this.discoveries.size >= 3) thresholdAchievements.push("field_notes");
    if (this.discoveries.size === DISCOVERIES.length) thresholdAchievements.push("naturalist");
    this.hooks.onMessage(`图鉴新增 ${discovery.icon}「${discovery.title}」。${discovery.note}${this.awardAchievements(...thresholdAchievements)}`);
  }

  private awardAchievements(...ids: string[]) {
    const unlocked: string[] = [];
    for (const id of ids) {
      if (this.achievements.has(id)) continue;
      const achievement = ACHIEVEMENTS.find((entry) => entry.id === id);
      if (!achievement) continue;
      this.achievements.add(id);
      unlocked.push(achievement.title);
    }
    return unlocked.length ? ` · 解锁成就「${unlocked.join("」「")}」` : "";
  }

  private refreshProgressAchievements() {
    if (this.discoveries.size >= 3) this.awardAchievements("field_notes");
    if (this.discoveries.size === DISCOVERIES.length) this.awardAchievements("naturalist");
    if (this.completed && ["waystone", "bench", "hive"].every((task) => this.sideActions.has(task))) this.awardAchievements("unhurried_day");
  }

  private taskViews(): TaskView[] {
    return [
      {
        id: "main",
        title: "把勿忘我种子送到山顶小屋",
        detail: this.objective(),
        progress: this.completed ? "已完成" : `${this.clues.size}/4 线索`,
        done: this.completed,
        optional: false,
      },
      {
        id: "waystone",
        title: "读懂桥边的旧路标",
        detail: "路标会把五个视觉区域串成一条可记忆的路线。",
        progress: this.sideActions.has("waystone") ? "已完成" : "未完成",
        done: this.sideActions.has("waystone"),
        optional: true,
      },
      {
        id: "bench",
        title: "在河边停一会儿",
        detail: "有些互动不提供道具，只提供一段属于今天的时间。",
        progress: this.sideActions.has("bench") ? "已完成" : "未完成",
        done: this.sideActions.has("bench"),
        optional: true,
      },
      {
        id: "hive",
        title: "让蜂场重新热闹",
        detail: "先照料缺水的花，再去看看安静的蜂箱。",
        progress: this.sideActions.has("hive") ? "已完成" : this.flowersWatered ? "可完成" : "等待花开",
        done: this.sideActions.has("hive"),
        optional: true,
      },
    ];
  }

  private collectClue(id: number) {
    const clue = CLUES[id];
    if (this.clues.has(id)) {
      this.hooks.onMessage(`${clue.title}：数字 ${clue.digit}。${clue.memory}`);
      return;
    }
    this.clues.add(id);
    this.save();
    this.hooks.onMessage(`记住了 ${clue.icon} 的数字：${clue.digit}。${clue.memory}`);
  }

  private addItem(id: ItemId) {
    this.inventory.add(id);
  }

  private objective() {
    if (this.completed) return "这一天已经好好度过";
    if (!this.clues.has(0) || !this.inventory.has("trowel")) return "调查水磨坊附近的闪光";
    if (!this.clues.has(1) || !this.inventory.has("water")) return "越过石桥，寻找野餐地";
    if (!this.moundCleared) return "用小铲清理上山土堆";
    if (!this.flowersWatered) return "把水留给枯萎的花";
    if (this.clues.size < CLUES.length) return "找齐四段生活线索";
    return "带着钥匙前往山顶小屋";
  }

  private playerCenter() {
    return { x: this.player.x + this.player.w / 2, y: this.player.y + this.player.h / 2 };
  }

  private riverCenter(y: number) {
    return 570 + Math.sin(y / 142) * 54;
  }

  private emitView() {
    this.hooks.onViewChange(this.getViewState());
  }

  private load(): PersistedState {
    const fallback: PersistedState = {
      clues: [], discoveries: [], achievements: [], sideActions: [], deaths: 0,
      completed: false, dangerAssist: false, reducedMotion: false,
    };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        clues: Array.isArray(parsed.clues) ? parsed.clues.filter((id) => Number.isInteger(id) && id >= 0 && id < CLUES.length) : [],
        discoveries: Array.isArray(parsed.discoveries) ? parsed.discoveries.filter((id) => DISCOVERIES.some((entry) => entry.id === id)) : [],
        achievements: Array.isArray(parsed.achievements) ? parsed.achievements.filter((id) => ACHIEVEMENTS.some((entry) => entry.id === id)) : [],
        sideActions: Array.isArray(parsed.sideActions) ? parsed.sideActions.filter((id) => ["waystone", "bench", "hive"].includes(id)) : [],
        deaths: Number.isFinite(parsed.deaths) ? Math.max(0, Number(parsed.deaths)) : 0,
        completed: Boolean(parsed.completed),
        dangerAssist: Boolean(parsed.dangerAssist),
        reducedMotion: Boolean(parsed.reducedMotion),
      };
    } catch {
      return fallback;
    }
  }

  private save() {
    const state: PersistedState = {
      clues: [...this.clues],
      discoveries: [...this.discoveries],
      achievements: [...this.achievements],
      sideActions: [...this.sideActions],
      deaths: this.deaths,
      completed: this.completed,
      dangerAssist: this.dangerAssist,
      reducedMotion: this.reducedMotion,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  private createFlowers() {
    const random = seededRandom(3142);
    const colors = ["#fff0a6", "#ff8fa5", "#9688ff", "#f7f5e3", "#ffb34e"];
    const flowers: Flower[] = [];
    for (let i = 0; i < 560; i += 1) {
      const point = { x: 24 + random() * (WORLD.width - 48), y: 40 + random() * (WORLD.height - 70) };
      const nearRiver = Math.abs(point.x - this.riverCenter(point.y)) < 92;
      const inBuilding = BUILDINGS.some((rect) => inside(point, rect));
      const nearPath = point.y > 480 && Math.abs(point.x - 820) < 120;
      if (!nearRiver && !inBuilding && !nearPath) flowers.push({ ...point, color: colors[Math.floor(random() * colors.length)], size: random() > 0.7 ? 4 : 3 });
    }
    return flowers;
  }

  private createTrees() {
    return [
      { x: 44, y: 120 }, { x: 240, y: 118 }, { x: 424, y: 126 }, { x: 890, y: 110 }, { x: 1110, y: 152 },
      { x: 1180, y: 575 }, { x: 1325, y: 610 }, { x: 1500, y: 520 }, { x: 54, y: 690 }, { x: 462, y: 836 },
      { x: 760, y: 850 }, { x: 1240, y: 830 }, { x: 1380, y: 780 }, { x: 1510, y: 790 },
    ];
  }

  private createTerrainDetails() {
    const random = seededRandom(81342);
    const details: TerrainDetail[] = [];
    for (let i = 0; i < 390; i += 1) {
      const point = { x: 28 + random() * (WORLD.width - 56), y: 58 + random() * (WORLD.height - 86) };
      const nearRiver = Math.abs(point.x - this.riverCenter(point.y)) < 105;
      const inBuilding = BUILDINGS.some((rect) => inside(point, rect));
      if (!nearRiver && !inBuilding) details.push({ ...point, variant: Math.floor(random() * 4) });
    }
    return details;
  }

  private draw(now: number) {
    const ctx = this.ctx;
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    ctx.fillStyle = "#8ed9d2";
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    this.drawGround();
    this.drawPaths();
    this.drawRiver(now);
    this.drawBridge();
    this.drawScenery(now);
    this.drawHazards(now);
    this.drawNavigation(now);
    this.drawInteractionFocus(now);
    this.drawPlayer(now);
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0);
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEWPORT.height);
    gradient.addColorStop(0, "rgba(255,255,218,.045)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(20,73,65,.12)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private drawGround() {
    const ctx = this.ctx;
    ctx.fillStyle = "#76c56f";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // Distinct terrain rooms: orchard, windy ridge and the upper flower terrace.
    ctx.fillStyle = "#6eb964";
    ctx.fillRect(0, 54, 610, 270);
    ctx.fillStyle = "#68b163";
    ctx.fillRect(680, 166, 430, 248);
    ctx.fillStyle = "#84cb70";
    ctx.fillRect(1080, 225, 480, 225);
    ctx.fillStyle = "#71bb67";
    ctx.fillRect(1020, 690, 560, 240);
    for (let y = 0; y < WORLD.height; y += 16) {
      for (let x = 0; x < WORLD.width; x += 16) {
        const tone = ((x / 16) * 7 + (y / 16) * 11) % 11;
        if (tone > 2) continue;
        ctx.fillStyle = tone === 0 ? "rgba(47,116,70,.24)" : "rgba(255,245,157,.22)";
        ctx.fillRect(x + 3 + tone * 3, y + 5, tone === 0 ? 5 : 3, 2);
        if (tone === 0) ctx.fillRect(x + 10, y + 11, 2, 3);
      }
    }
    ctx.fillStyle = "#39794b";
    ctx.fillRect(0, 0, WORLD.width, 52);
    ctx.fillStyle = "#4f9855";
    for (let x = 0; x < WORLD.width; x += 64) {
      ctx.fillRect(x, 42 + (x / 64 % 2) * 5, 58, 30);
      ctx.fillStyle = "#6db263";
      ctx.fillRect(x + 8, 50 + (x / 64 % 2) * 5, 34, 8);
      ctx.fillStyle = "#4f9855";
    }
  }

  private drawPaths() {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#d9c783";
    ctx.lineWidth = 92;
    ctx.beginPath();
    ctx.moveTo(TRAIL_POINTS[0].x, TRAIL_POINTS[0].y);
    for (const point of TRAIL_POINTS.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.strokeStyle = "#ead99a";
    ctx.lineWidth = 64;
    ctx.stroke();
    ctx.restore();
    let pebbleIndex = 0;
    for (let segment = 0; segment < TRAIL_POINTS.length - 1; segment += 1) {
      const from = TRAIL_POINTS[segment];
      const to = TRAIL_POINTS[segment + 1];
      const segmentLength = distance(from, to);
      for (let travelled = 28; travelled < segmentLength; travelled += 46) {
        const t = travelled / segmentLength;
        const side = pebbleIndex % 2 ? 24 : -28;
        const nx = -(to.y - from.y) / segmentLength;
        const ny = (to.x - from.x) / segmentLength;
        const x = from.x + (to.x - from.x) * t + nx * side;
        const y = from.y + (to.y - from.y) * t + ny * side;
        ctx.fillStyle = pebbleIndex % 3 ? "#c7b477" : "#f4e4a8";
        ctx.fillRect(Math.round(x), Math.round(y), pebbleIndex % 3 === 0 ? 9 : 6, 4);
        pebbleIndex += 1;
      }
    }
  }

  private drawRiver(now: number) {
    const ctx = this.ctx;
    for (let y = 0; y < WORLD.height; y += 16) {
      const center = this.riverCenter(y);
      ctx.fillStyle = "#3e8958";
      ctx.fillRect(Math.round(center - 91), y, 182, 17);
      ctx.fillStyle = "#94ca72";
      ctx.fillRect(Math.round(center - 83), y, 166, 17);
      ctx.fillStyle = "#2a8fad";
      ctx.fillRect(Math.round(center - 76), y, 152, 17);
      ctx.fillStyle = "#43bed1";
      ctx.fillRect(Math.round(center - 66), y, 132, 17);
      if ((y / 16) % 3 === 0) {
        const shift = this.reducedMotion ? 0 : Math.floor((now / 140 + y) % 36);
        ctx.fillStyle = "#a4edf0";
        ctx.fillRect(Math.round(center - 54 + shift), y + 5, 26, 3);
        ctx.fillStyle = "#e1fbef";
        ctx.fillRect(Math.round(center + 8 - shift / 2), y + 11, 18, 2);
      }
    }
    ctx.fillStyle = "#d8c978";
    for (let y = 60; y < 930; y += 92) {
      const center = this.riverCenter(y);
      ctx.fillRect(center - 83, y, 8, 14);
      ctx.fillRect(center + 75, y + 12, 8, 12);
    }
    for (const lily of [{ x: 548, y: 706 }, { x: 536, y: 764 }, { x: 580, y: 878 }]) {
      ctx.fillStyle = "#2f8759";
      ctx.fillRect(lily.x - 8, lily.y, 16, 7);
      ctx.fillRect(lily.x - 5, lily.y - 3, 8, 4);
      ctx.fillStyle = "#ffd1d8";
      ctx.fillRect(lily.x - 1, lily.y - 5, 5, 5);
    }
  }

  private drawBridge() {
    const ctx = this.ctx;
    const center = this.riverCenter(530);
    ctx.fillStyle = "#6f4c31";
    ctx.fillRect(center - 126, 493, 252, 76);
    ctx.fillStyle = "#ad7940";
    for (let x = center - 118; x < center + 118; x += 22) {
      ctx.fillRect(Math.round(x), 501, 18, 60);
      ctx.fillStyle = "#d79a50";
      ctx.fillRect(Math.round(x), 505, 18, 5);
      ctx.fillStyle = "#ad7940";
    }
    ctx.fillStyle = "#4a3928";
    ctx.fillRect(center - 130, 493, 8, 76);
    ctx.fillRect(center + 122, 493, 8, 76);
  }

  private drawScenery(now: number) {
    this.drawTerrainDetails();
    this.drawSmallLandmarks();
    this.drawInteractiveProps(now);
    for (const flower of this.flowers) this.drawFlower(flower, now);
    for (const tree of this.trees) this.drawTree(tree.x, tree.y);
    this.drawWindmill(now);
    this.drawCottage();
    this.drawPicnic();
    this.drawWindPost();
    this.drawMound();
    this.drawWiltedFlowers(now);
    this.drawBranchTree();
    this.drawSparkles(now);
  }

  private drawTerrainDetails() {
    const ctx = this.ctx;
    for (const detail of this.terrainDetails) {
      const x = Math.round(detail.x);
      const y = Math.round(detail.y);
      if (detail.variant < 2) {
        ctx.fillStyle = detail.variant ? "#4b9b59" : "#5dab60";
        ctx.fillRect(x, y, 2, 7);
        ctx.fillRect(x - 3, y + 3, 3, 2);
        ctx.fillRect(x + 2, y + 2, 3, 2);
      } else {
        ctx.fillStyle = detail.variant === 2 ? "#a5ad79" : "#d2c98c";
        ctx.fillRect(x, y + 2, 7, 4);
        ctx.fillStyle = "rgba(43,92,68,.2)";
        ctx.fillRect(x + 2, y + 6, 7, 2);
      }
    }
  }

  private drawSmallLandmarks() {
    const ctx = this.ctx;
    // Bee boxes make the upper meadow read as a cultivated destination.
    for (let i = 0; i < 3; i += 1) {
      const x = 1208 + i * 42;
      ctx.fillStyle = "#5f4831";
      ctx.fillRect(x + 4, 409, 24, 6);
      ctx.fillStyle = "#e7ad48";
      ctx.fillRect(x, 382, 32, 27);
      ctx.fillStyle = "#ffe08a";
      ctx.fillRect(x + 3, 386, 26, 5);
      ctx.fillStyle = "#4b3a2b";
      ctx.fillRect(x + 12, 400, 8, 4);
    }
    // A low stone line frames the windy ridge without becoming a hard wall.
    for (let i = 0; i < 7; i += 1) {
      const x = 706 + i * 43;
      const y = 202 + (i % 2) * 3;
      ctx.fillStyle = "#61766b";
      ctx.fillRect(x, y, 35, 14);
      ctx.fillStyle = "#8e9e87";
      ctx.fillRect(x + 4, y - 4, 25, 6);
    }
    // Trail sign near the bridge: a readable navigation landmark.
    ctx.fillStyle = "#6b4a31";
    ctx.fillRect(688, 602, 8, 48);
    ctx.fillRect(671, 604, 43, 18);
    ctx.fillStyle = "#f2cd6f";
    ctx.fillRect(698, 610, 8, 5);
  }

  private drawInteractiveProps(now: number) {
    const ctx = this.ctx;

    // River bench.
    ctx.fillStyle = "rgba(34,74,55,.22)";
    ctx.fillRect(738, 752, 70, 8);
    ctx.fillStyle = "#6e492d";
    ctx.fillRect(740, 716, 62, 9);
    ctx.fillRect(744, 730, 58, 10);
    ctx.fillRect(749, 738, 7, 18);
    ctx.fillRect(790, 738, 7, 18);
    ctx.fillStyle = "#c88743";
    ctx.fillRect(744, 718, 54, 3);
    ctx.fillRect(748, 732, 50, 3);

    // Refillable spring: a utility object rather than one-use scenery.
    ctx.fillStyle = "#547866";
    ctx.fillRect(786, 824, 58, 34);
    ctx.fillStyle = "#8ca47f";
    ctx.fillRect(792, 818, 46, 12);
    ctx.fillStyle = "#2f8fab";
    ctx.fillRect(797, 829, 36, 24);
    ctx.fillStyle = "#8ce3e5";
    ctx.fillRect(802, 832, 22, 4);
    ctx.fillRect(817, 840, 11, 3);

    // Five collectible observations, each with a unique silhouette.
    ctx.fillStyle = "#f7f3d2";
    ctx.fillRect(381, 845, 3, 13);
    ctx.fillRect(376, 841, 13, 3);
    ctx.fillRect(379, 838, 7, 9);
    ctx.fillStyle = "#d8e889";
    ctx.fillRect(380, 857, 2, 6);

    ctx.fillStyle = "#347a51";
    ctx.fillRect(666, 641, 17, 9);
    ctx.fillRect(670, 636, 9, 8);
    ctx.fillStyle = "#f4dc75";
    ctx.fillRect(671, 640, 3, 3);
    ctx.fillStyle = "#285f43";
    ctx.fillRect(663, 648, 7, 3);
    ctx.fillRect(679, 648, 7, 3);

    ctx.fillStyle = "#e29552";
    ctx.fillRect(895, 221, 13, 10);
    ctx.fillStyle = "#f1b965";
    ctx.fillRect(898, 218, 9, 8);
    ctx.fillStyle = "#6b523b";
    ctx.fillRect(907, 228, 10, 3);
    ctx.fillRect(914, 226, 3, 6);

    const wing = this.reducedMotion ? 0 : Math.round(Math.sin(now / 120) * 2);
    ctx.fillStyle = "#f58ba8";
    ctx.fillRect(1174 - wing, 456, 9, 12);
    ctx.fillRect(1187 + wing, 456, 9, 12);
    ctx.fillStyle = "#65404b";
    ctx.fillRect(1183, 459, 4, 13);
    ctx.fillStyle = "#ffd27b";
    ctx.fillRect(1178 - wing, 459, 4, 4);
    ctx.fillRect(1189 + wing, 459, 4, 4);

    // Mountain lookout and its slowly passing cloud shadow.
    ctx.fillStyle = "#66503b";
    ctx.fillRect(1475, 279, 9, 32);
    ctx.fillRect(1463, 282, 34, 8);
    ctx.fillStyle = "#8fd5d5";
    ctx.fillRect(1484, 271, 21, 10);
    ctx.fillStyle = "#e9f7df";
    ctx.fillRect(1488, 268, 13, 5);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#254f4f";
    ctx.fillRect(1444 + (this.reducedMotion ? 0 : Math.round(Math.sin(now / 900) * 8)), 312, 70, 16);
    ctx.restore();
  }

  private drawNavigation(now: number) {
    if (!this.navigationTarget) return;
    const ctx = this.ctx;
    const points = [this.playerCenter(), ...this.navigationPath];
    ctx.save();
    ctx.globalAlpha = 0.66;
    for (let segment = 0; segment < points.length - 1; segment += 1) {
      const from = points[segment];
      const to = points[segment + 1];
      const length = distance(from, to);
      for (let travelled = 18; travelled < length; travelled += 22) {
        const t = travelled / length;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        ctx.fillStyle = "#fff3a1";
        ctx.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
      }
    }
    const target = this.navigationTarget;
    const pulse = this.reducedMotion ? 0 : Math.round(Math.sin(now / 150) * 2);
    ctx.fillStyle = "rgba(31,74,63,.34)";
    ctx.fillRect(target.x - 14, target.y + 8, 28, 6);
    ctx.fillStyle = "#fff1a0";
    ctx.fillRect(target.x - 14 - pulse, target.y - 2, 7, 4);
    ctx.fillRect(target.x + 7 + pulse, target.y - 2, 7, 4);
    ctx.fillRect(target.x - 2, target.y - 14 - pulse, 4, 7);
    ctx.fillRect(target.x - 2, target.y + 7 + pulse, 4, 7);
    ctx.restore();
  }

  private drawInteractionFocus(now: number) {
    if (!this.hoveredInteraction || this.paused) return;
    const point = INTERACTION_POINTS[this.hoveredInteraction];
    const radius = 22 + (this.reducedMotion ? 0 : Math.round(Math.sin(now / 170) * 2));
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = SIGNAL_COLORS[INTERACTION_KINDS[this.hoveredInteraction] ?? "story"];
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    ctx.strokeRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
    ctx.restore();
  }

  private drawFlower(flower: Flower, now: number) {
    const ctx = this.ctx;
    const sway = this.reducedMotion ? 0 : Math.round(Math.sin(now / 420 + flower.x) * 1);
    ctx.fillStyle = "#2f8051";
    ctx.fillRect(Math.round(flower.x), Math.round(flower.y), 2, flower.size + 2);
    ctx.fillStyle = flower.color;
    ctx.fillRect(Math.round(flower.x - flower.size / 2 + sway), Math.round(flower.y - 2), flower.size, flower.size);
    ctx.fillStyle = "#ffe57a";
    ctx.fillRect(Math.round(flower.x + sway), Math.round(flower.y - 1), 1, 1);
  }

  private drawTree(x: number, y: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#6b4630";
    ctx.fillRect(x - 10, y + 38, 20, 52);
    ctx.fillStyle = "#2e7148";
    ctx.fillRect(x - 46, y + 4, 92, 46);
    ctx.fillStyle = "#3f8c52";
    ctx.fillRect(x - 32, y - 20, 66, 78);
    ctx.fillStyle = "#65aa5e";
    ctx.fillRect(x - 20, y - 12, 28, 14);
    ctx.fillStyle = "#285e41";
    ctx.fillRect(x + 17, y + 34, 24, 14);
    if (x > 1030 && y < 620) {
      ctx.fillStyle = "#ffd0d3";
      ctx.fillRect(x - 28, y - 9, 10, 7);
      ctx.fillRect(x + 8, y + 2, 12, 8);
      ctx.fillRect(x - 5, y + 29, 9, 7);
      ctx.fillStyle = "#fff0d8";
      ctx.fillRect(x - 25, y - 7, 4, 3);
      ctx.fillRect(x + 12, y + 4, 4, 3);
    }
  }

  private drawWindmill(now: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#835d3b";
    ctx.fillRect(88, 578, 310, 166);
    ctx.fillStyle = "#f5d48e";
    ctx.fillRect(106, 597, 274, 147);
    ctx.fillStyle = "#744c34";
    for (let x = 88; x < 398; x += 32) ctx.fillRect(x, 553 + Math.abs(243 - x) * 0.08, 31, 45);
    ctx.fillStyle = "#392c2b";
    ctx.fillRect(162, 659, 56, 85);
    ctx.fillStyle = "#f9c45c";
    ctx.fillRect(268, 630, 52, 42);
    ctx.fillStyle = "#40301f";
    ctx.fillRect(414, 632, 18, 116);
    const angle = this.reducedMotion ? 0 : now / 1800;
    ctx.save();
    ctx.translate(423, 630);
    ctx.rotate(angle);
    ctx.fillStyle = "#9d6d3b";
    ctx.fillRect(-7, -68, 14, 136);
    ctx.fillRect(-68, -7, 136, 14);
    ctx.restore();
    ctx.fillStyle = "#674126";
    ctx.fillRect(416, 623, 14, 14);
    ctx.fillStyle = "#253c39";
    ctx.fillRect(388, 702, 46, 35);
    ctx.fillStyle = "#f2d078";
    ctx.font = "bold 18px monospace";
    ctx.fillText("3", 404, 727);
  }

  private drawCottage() {
    const ctx = this.ctx;
    ctx.fillStyle = "#704434";
    ctx.fillRect(1264, 94, 272, 142);
    ctx.fillStyle = "#f0c47a";
    ctx.fillRect(1280, 108, 240, 128);
    ctx.fillStyle = "#a44f42";
    for (let x = 1248; x < 1552; x += 32) ctx.fillRect(x, 66 + Math.abs(1400 - x) * 0.12, 31, 45);
    ctx.fillStyle = "#69432f";
    ctx.fillRect(1364, 158, 68, 78);
    ctx.fillStyle = "#ffe27b";
    ctx.fillRect(1303, 135, 38, 35);
    ctx.fillRect(1454, 135, 38, 35);
    ctx.fillStyle = "#29433c";
    ctx.fillRect(1331, 216, 32, 34);
    ctx.fillStyle = "#f2d078";
    ctx.font = "bold 17px monospace";
    ctx.fillText("2", 1342, 239);
  }

  private drawPicnic() {
    const ctx = this.ctx;
    ctx.fillStyle = "#fff2d0";
    ctx.fillRect(848, 680, 126, 90);
    ctx.fillStyle = "#ee9c9c";
    for (let y = 680; y < 770; y += 22) ctx.fillRect(848, y, 126, 9);
    for (let x = 848; x < 974; x += 28) ctx.fillRect(x, 680, 10, 90);
    ctx.fillStyle = "#a86732";
    ctx.fillRect(884, 696, 46, 34);
    ctx.fillStyle = "#f6d272";
    ctx.fillRect(890, 690, 34, 12);
    ctx.fillStyle = "#d66a6a";
    ctx.fillRect(938, 716, 20, 24);
  }

  private drawWindPost() {
    const ctx = this.ctx;
    ctx.fillStyle = "#66533c";
    ctx.fillRect(780, 302, 10, 82);
    ctx.fillRect(762, 304, 46, 8);
    if (this.windTied) {
      const windPhase = this.elapsed % 8;
      const length = windPhase > 5.35 ? 50 : 28;
      ctx.fillStyle = "#ef5966";
      ctx.fillRect(788, 315, length, 8);
      ctx.fillRect(788 + length - 8, 323, 8, 8);
    }
  }

  private drawMound() {
    if (this.moundCleared) return;
    const ctx = this.ctx;
    ctx.fillStyle = "#8b663c";
    ctx.fillRect(MOUND.x, MOUND.y + 20, MOUND.w, MOUND.h - 20);
    ctx.fillStyle = "#aa824a";
    ctx.fillRect(MOUND.x + 20, MOUND.y + 4, MOUND.w - 40, MOUND.h - 10);
    ctx.fillStyle = "#6e5337";
    ctx.fillRect(MOUND.x + 40, MOUND.y + 21, 22, 12);
    ctx.fillRect(MOUND.x + 92, MOUND.y + 11, 18, 10);
  }

  private drawWiltedFlowers(now: number) {
    const ctx = this.ctx;
    const colors = this.flowersWatered ? ["#ff7fa1", "#fff29b", "#9c8cff"] : ["#927052"];
    for (let i = 0; i < 16; i += 1) {
      const x = 1135 + (i % 6) * 15;
      const y = 315 + Math.floor(i / 6) * 17;
      ctx.fillStyle = "#2d794a";
      ctx.fillRect(x, y, 2, 12);
      ctx.fillStyle = colors[i % colors.length];
      const lift = this.flowersWatered ? Math.sin(now / 300 + i) * 1 : 6;
      ctx.fillRect(x - 3, Math.round(y - 3 + lift), 8, 6);
    }
    if (this.flowersWatered) {
      ctx.fillStyle = "#f4c64f";
      ctx.fillRect(1170, 328, 15, 5);
      ctx.fillRect(1181, 323, 6, 15);
    }
  }

  private drawBranchTree() {
    const ctx = this.ctx;
    ctx.fillStyle = "#72503b";
    ctx.fillRect(1120, 500, 20, 96);
    ctx.fillStyle = "#397b4a";
    ctx.fillRect(1070, 470, 120, 58);
    ctx.fillStyle = "#59a75b";
    ctx.fillRect(1090, 450, 82, 65);
    if (this.branchFallen) {
      ctx.fillStyle = "#70462d";
      ctx.fillRect(1064, 582, 118, 14);
      ctx.fillRect(1080, 570, 16, 36);
    }
  }

  private drawSparkles(now: number) {
    const pulse = this.reducedMotion ? 0 : Math.round(Math.sin(now / 180) * 2);
    for (const [id, point] of Object.entries(INTERACTION_POINTS)) {
      if (!this.interactionIsActive(id)) continue;
      const kind = INTERACTION_KINDS[id] ?? "story";
      const color = SIGNAL_COLORS[kind];
      const size = 12 + pulse;
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = color;
      ctx.fillRect(point.x - size - 5, point.y - size - 5, (size + 5) * 2, (size + 5) * 2);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(point.x - size, point.y - size, 7, 3);
      ctx.fillRect(point.x - size, point.y - size, 3, 7);
      ctx.fillRect(point.x + size - 7, point.y - size, 7, 3);
      ctx.fillRect(point.x + size - 3, point.y - size, 3, 7);
      ctx.fillRect(point.x - size, point.y + size - 3, 7, 3);
      ctx.fillRect(point.x - size, point.y + size - 7, 3, 7);
      ctx.fillRect(point.x + size - 7, point.y + size - 3, 7, 3);
      ctx.fillRect(point.x + size - 3, point.y + size - 7, 3, 7);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(point.x - 1, point.y - 5, 2, 10);
      ctx.fillRect(point.x - 5, point.y - 1, 10, 2);
      ctx.restore();
    }
  }

  private interactionIsActive(id: string) {
    const active: Record<string, boolean> = {
      mill: !this.clues.has(0),
      trowel: !this.inventory.has("trowel"),
      postcard: !this.clues.has(2),
      picnic: !this.clues.has(1) || !this.inventory.has("ribbon"),
      windpost: !this.windTied,
      mound: !this.moundCleared,
      flowers: !this.flowersWatered,
      cottage: !this.completed,
      waystone: !this.sideActions.has("waystone"),
      bench: !this.sideActions.has("bench"),
      spring: !this.inventory.has("water") && !this.flowersWatered,
      hive: !this.sideActions.has("hive"),
    };
    const isDiscovery = DISCOVERIES.some((discovery) => discovery.id === id);
    return isDiscovery ? !this.discoveries.has(id) : Boolean(active[id]);
  }

  private drawHazards(now: number) {
    const ctx = this.ctx;
    const phase = this.elapsed % 8;
    if (phase >= 5.35) {
      const active = phase >= 6.7;
      const intensity = active ? 1 : (phase - 5.35) / 1.35;
      ctx.save();
      ctx.globalAlpha = 0.2 + intensity * 0.45;
      ctx.fillStyle = active ? "#e95b63" : "#ffe08a";
      for (let y = WIND_ZONE.y + 12; y < WIND_ZONE.y + WIND_ZONE.h; y += 25) {
        const shift = this.reducedMotion ? 0 : Math.floor((now / 18 + y) % 90);
        ctx.fillRect(WIND_ZONE.x + shift, y, 82, 5);
        ctx.fillRect(WIND_ZONE.x + 220 - shift / 2, y + 9, 54, 4);
      }
      ctx.restore();
    }
    if (this.dangerAssist) {
      ctx.save();
      ctx.strokeStyle = phase >= 5.35 ? "#ff625f" : "rgba(255,255,255,.35)";
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(WIND_ZONE.x, WIND_ZONE.y, WIND_ZONE.w, WIND_ZONE.h);
      ctx.restore();
    }

    if (this.branchTriggeredAt !== null && !this.branchFallen) {
      const progress = clamp((now - this.branchTriggeredAt) / 1050, 0, 1);
      const w = 22 + progress * 92;
      const h = 12 + progress * 55;
      ctx.fillStyle = `rgba(60, 45, 42, ${0.2 + progress * 0.55})`;
      ctx.fillRect(BRANCH_ZONE.x + BRANCH_ZONE.w / 2 - w / 2, BRANCH_ZONE.y + BRANCH_ZONE.h / 2 - h / 2, w, h);
      if (this.dangerAssist) {
        ctx.strokeStyle = "#ff625f";
        ctx.lineWidth = 5;
        ctx.strokeRect(BRANCH_ZONE.x, BRANCH_ZONE.y, BRANCH_ZONE.w, BRANCH_ZONE.h);
      }
    }
  }

  private drawPlayer(now: number) {
    const ctx = this.ctx;
    const moving = this.isMoving;
    const bob = moving && !this.reducedMotion ? Math.round(Math.sin(now / 90) * 2) : 0;
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y + bob);
    ctx.fillStyle = "rgba(34,67,54,.25)";
    ctx.fillRect(x - 5, y + 31, 36, 8);
    ctx.fillStyle = "#583b2e";
    ctx.fillRect(x + 3, y + 29, 7, 7);
    ctx.fillRect(x + 17, y + 29, 7, 7);
    ctx.fillStyle = "#e6a33d";
    ctx.fillRect(x + 2, y + 16, 23, 17);
    ctx.fillStyle = "#f5c767";
    ctx.fillRect(x + 6, y + 17, 15, 12);
    ctx.fillStyle = "#f5c39e";
    ctx.fillRect(x, y + 1, 27, 20);
    ctx.fillStyle = "#51352f";
    ctx.fillRect(x - 2, y - 2, 31, 9);
    ctx.fillRect(x - 2, y + 3, 6, 12);
    ctx.fillRect(x + 23, y + 3, 6, 12);
    ctx.fillStyle = "#d8883c";
    ctx.fillRect(x - 5, y - 7, 37, 7);
    ctx.fillRect(x, y - 12, 27, 6);
    ctx.fillStyle = "#2d3138";
    if (this.player.direction !== "up") {
      ctx.fillRect(x + 6, y + 9, 3, 4);
      ctx.fillRect(x + 18, y + 9, 3, 4);
      ctx.fillStyle = "#d96868";
      ctx.fillRect(x + 12, y + 15, 4, 2);
    }
    ctx.fillStyle = "#9c5437";
    ctx.fillRect(x + 23, y + 19, 7, 14);
    ctx.fillStyle = "#f2d36f";
    ctx.fillRect(x + 24, y + 20, 4, 4);
  }
}
