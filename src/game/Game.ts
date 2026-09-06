import { CLUES, ITEMS, ITEM_ORDER, PASSCODE, VIEWPORT, WORLD } from "./content";
import type { DeathInfo, Direction, GameHooks, ItemId, ViewState } from "./types";

type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };
type Flower = Point & { color: string; size: number };

interface PersistedState {
  clues: number[];
  deaths: number;
  completed: boolean;
  dangerAssist: boolean;
  reducedMotion: boolean;
}

const SAVE_KEY = "one-more-day:flower-valley:v1";
const PLAYER_SIZE = { w: 26, h: 34 };

const BUILDINGS: Rect[] = [
  { x: 88, y: 328, w: 310, h: 224 },
  { x: 1264, y: 34, w: 272, h: 202 },
];

const MOUND: Rect = { x: 990, y: 402, w: 142, h: 66 };
const WIND_ZONE: Rect = { x: 720, y: 250, w: 330, h: 112 };
const BRANCH_ZONE: Rect = { x: 1058, y: 535, w: 126, h: 104 };

const INTERACTION_POINTS: Record<string, Point> = {
  mill: { x: 414, y: 536 },
  trowel: { x: 326, y: 632 },
  postcard: { x: 674, y: 532 },
  picnic: { x: 904, y: 724 },
  windpost: { x: 786, y: 380 },
  mound: { x: 1054, y: 477 },
  flowers: { x: 1172, y: 336 },
  cottage: { x: 1398, y: 252 },
};

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
  private lastFrame = performance.now();
  private lastViewUpdate = 0;
  private elapsed = 0;
  private paused = true;
  private selectedSlot = 0;
  private inventory = new Set<ItemId>(["journal"]);
  private clues = new Set<number>();
  private deaths = 0;
  private completed = false;
  private dangerAssist = false;
  private reducedMotion = false;
  private player = { x: 176, y: 760, ...PLAYER_SIZE, direction: "down" as Direction };
  private camera = { x: 0, y: 410 };
  private moundCleared = false;
  private flowersWatered = false;
  private windTied = false;
  private branchTriggeredAt: number | null = null;
  private branchFallen = false;
  private currentInteraction: string | null = null;
  private lastDangerNotice = "";

  constructor(canvas: HTMLCanvasElement, hooks: GameHooks) {
    this.canvas = canvas;
    this.hooks = hooks;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D is not available");
    this.ctx = context;
    this.canvas.width = VIEWPORT.width;
    this.canvas.height = VIEWPORT.height;
    this.ctx.imageSmoothingEnabled = false;
    const persisted = this.load();
    this.clues = new Set(persisted.clues);
    this.deaths = persisted.deaths;
    this.completed = persisted.completed;
    this.dangerAssist = persisted.dangerAssist;
    this.reducedMotion = persisted.reducedMotion;
    this.flowers = this.createFlowers();
    this.trees = this.createTrees();
    this.bindKeyboard();
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

  interact() {
    if (this.paused) return;
    const id = this.nearestInteraction();
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
          this.hooks.onMessage("把丝带系好了。风来之前，它会先绷直。");
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
          this.addItem("key");
          this.hooks.onMessage("把最后一点水留给了小花。获得黄铜钥匙。");
          this.save();
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
    }
    this.emitView();
  }

  submitCode(value: string) {
    if (value !== PASSCODE) {
      this.hooks.onMessage("顺序不对。看看日志里四个图案的排列。");
      return false;
    }
    this.completed = true;
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
    this.player = { x: 176, y: 760, ...PLAYER_SIZE, direction: "down" };
    this.camera = { x: 0, y: 410 };
    this.elapsed = 0;
    this.moundCleared = false;
    this.flowersWatered = false;
    this.windTied = false;
    this.branchTriggeredAt = null;
    this.branchFallen = false;
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
    if (x || y) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
      const speed = 168;
      if (Math.abs(x) > Math.abs(y)) this.player.direction = x > 0 ? "right" : "left";
      else this.player.direction = y > 0 ? "down" : "up";
      this.tryMove(x * speed * dt, 0);
      this.tryMove(0, y * speed * dt);
    }

    this.camera.x += (clamp(this.player.x - VIEWPORT.width / 2, 0, WORLD.width - VIEWPORT.width) - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (clamp(this.player.y - VIEWPORT.height / 2, 0, WORLD.height - VIEWPORT.height) - this.camera.y) * Math.min(1, dt * 5);
    this.updateHazards(now);
    this.currentInteraction = this.interactionLabel(this.nearestInteraction());
    if (now - this.lastViewUpdate > 120) {
      this.lastViewUpdate = now;
      this.emitView();
    }
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
    let nearestDistance = 64;
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
      mill: this.clues.has(0) ? "E 再看一眼旧门牌" : "E 调查旧磨坊门牌",
      trowel: this.inventory.has("trowel") ? "E 查看空木箱" : "E 拾取小铲",
      postcard: this.clues.has(2) ? "E 阅读明信片" : "E 拾起发光的明信片",
      picnic: this.clues.has(1) ? "E 查看野餐地" : "E 调查野餐便笺",
      windpost: "E 调查风向杆",
      mound: this.moundCleared ? "E 查看清开的路" : "E 清理土堆",
      flowers: "E 照料枯萎的小花",
      cottage: this.clues.has(3) ? "E 尝试打开小屋" : "E 调查山顶门牌",
    };
    return labels[id];
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
    const fallback: PersistedState = { clues: [], deaths: 0, completed: false, dangerAssist: false, reducedMotion: false };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        clues: Array.isArray(parsed.clues) ? parsed.clues.filter((id) => Number.isInteger(id) && id >= 0 && id < CLUES.length) : [],
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
      { x: 44, y: 120 }, { x: 424, y: 126 }, { x: 890, y: 110 }, { x: 1110, y: 152 },
      { x: 1180, y: 575 }, { x: 1325, y: 610 }, { x: 1500, y: 520 }, { x: 54, y: 690 },
      { x: 760, y: 850 }, { x: 1240, y: 830 }, { x: 1510, y: 790 },
    ];
  }

  private draw(now: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#8ed9d2";
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
    ctx.translate(-Math.round(this.camera.x), -Math.round(this.camera.y));
    this.drawGround();
    this.drawPaths();
    this.drawRiver(now);
    this.drawBridge();
    this.drawScenery(now);
    this.drawHazards(now);
    this.drawPlayer(now);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEWPORT.height);
    gradient.addColorStop(0, "rgba(255,255,218,.07)");
    gradient.addColorStop(0.75, "rgba(255,255,255,0)");
    gradient.addColorStop(1, "rgba(20,73,65,.16)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private drawGround() {
    const ctx = this.ctx;
    ctx.fillStyle = "#73bd6b";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    for (let y = 0; y < WORLD.height; y += 32) {
      for (let x = 0; x < WORLD.width; x += 32) {
        const tone = ((x / 32) * 7 + (y / 32) * 11) % 5;
        ctx.fillStyle = tone === 0 ? "#6bb263" : tone === 1 ? "#79c36f" : "#73bd6b";
        ctx.fillRect(x, y, 32, 32);
        if (tone === 0) {
          ctx.fillStyle = "#589c5a";
          ctx.fillRect(x + 6, y + 20, 3, 6);
          ctx.fillRect(x + 12, y + 18, 3, 8);
        }
      }
    }
    ctx.fillStyle = "#4e8e50";
    ctx.fillRect(0, 0, WORLD.width, 46);
  }

  private drawPaths() {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#d9c783";
    ctx.lineWidth = 92;
    ctx.beginPath();
    ctx.moveTo(150, 790);
    ctx.lineTo(322, 646);
    ctx.lineTo(520, 535);
    ctx.lineTo(682, 535);
    ctx.lineTo(890, 715);
    ctx.lineTo(1080, 600);
    ctx.lineTo(1050, 455);
    ctx.lineTo(1180, 334);
    ctx.lineTo(1395, 252);
    ctx.stroke();
    ctx.strokeStyle = "#eadb9d";
    ctx.lineWidth = 66;
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 30; i += 1) {
      const x = 170 + i * 41;
      const y = 770 - Math.sin(i * 0.7) * 7;
      ctx.fillStyle = i % 2 ? "#c8b675" : "#f0dda0";
      ctx.fillRect(x, y, 10, 5);
    }
  }

  private drawRiver(now: number) {
    const ctx = this.ctx;
    for (let y = 0; y < WORLD.height; y += 16) {
      const center = this.riverCenter(y);
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
  }

  private drawWindmill(now: number) {
    const ctx = this.ctx;
    ctx.fillStyle = "#835d3b";
    ctx.fillRect(88, 386, 310, 166);
    ctx.fillStyle = "#f5d48e";
    ctx.fillRect(106, 405, 274, 147);
    ctx.fillStyle = "#744c34";
    for (let x = 88; x < 398; x += 32) ctx.fillRect(x, 361 + Math.abs(243 - x) * 0.08, 31, 45);
    ctx.fillStyle = "#392c2b";
    ctx.fillRect(162, 467, 56, 85);
    ctx.fillStyle = "#f9c45c";
    ctx.fillRect(268, 438, 52, 42);
    ctx.fillStyle = "#40301f";
    ctx.fillRect(414, 440, 18, 116);
    const angle = this.reducedMotion ? 0 : now / 1800;
    ctx.save();
    ctx.translate(423, 438);
    ctx.rotate(angle);
    ctx.fillStyle = "#9d6d3b";
    ctx.fillRect(-7, -68, 14, 136);
    ctx.fillRect(-68, -7, 136, 14);
    ctx.restore();
    ctx.fillStyle = "#674126";
    ctx.fillRect(416, 431, 14, 14);
    ctx.fillStyle = "#253c39";
    ctx.fillRect(388, 510, 46, 35);
    ctx.fillStyle = "#f2d078";
    ctx.font = "bold 18px monospace";
    ctx.fillText("3", 404, 535);
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
    const targets: Point[] = [];
    if (!this.clues.has(0)) targets.push(INTERACTION_POINTS.mill);
    if (!this.inventory.has("trowel")) targets.push(INTERACTION_POINTS.trowel);
    if (!this.clues.has(2)) targets.push(INTERACTION_POINTS.postcard);
    if (!this.clues.has(1)) targets.push(INTERACTION_POINTS.picnic);
    if (!this.flowersWatered || !this.inventory.has("key")) targets.push(INTERACTION_POINTS.flowers);
    if (!this.clues.has(3)) targets.push(INTERACTION_POINTS.cottage);
    const pulse = this.reducedMotion ? 1 : 0.6 + Math.sin(now / 180) * 0.35;
    for (const point of targets) {
      const size = 6 + Math.round(pulse * 5);
      this.ctx.fillStyle = "#fff9a9";
      this.ctx.fillRect(point.x - 2, point.y - size, 4, size * 2);
      this.ctx.fillRect(point.x - size, point.y - 2, size * 2, 4);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
    }
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
    const moving = this.keys.size > 0 || this.virtualKeys.size > 0;
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
