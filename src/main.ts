import "./style.css";
import { CLUES, ITEMS, ITEM_ORDER, PASSCODE } from "./game/content";
import { Game } from "./game/Game";
import type { DeathInfo, Direction, ViewState } from "./game/types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = `
  <main class="app-shell">
    <header class="site-header">
      <div class="wordmark"><span class="wordmark-flower">✦</span><div><b>今天，也要好好活着</b><small>ONE MORE DAY · PLAYABLE PROTOTYPE</small></div></div>
      <div class="prototype-chip"><i></i> 春日花谷 · 原型 0.1</div>
    </header>

    <section class="game-frame" aria-label="春日花谷游戏区域">
      <canvas id="gameCanvas" aria-label="Q版像素风春日花谷探索地图"></canvas>

      <div class="hud-top-left pixel-panel">
        <div class="weather-icon">☀</div>
        <div><b>DAY 03</b><span id="timeValue">09:10</span></div>
      </div>
      <div class="objective-chip pixel-panel"><span>★</span><b id="objectiveValue">调查水磨坊附近的闪光</b></div>
      <button id="menuButton" class="round-button pixel-panel" aria-label="打开背包菜单" aria-expanded="false">▣</button>

      <div id="toast" class="toast" role="status" aria-live="polite"></div>
      <div id="interactionPrompt" class="interaction-prompt" hidden></div>

      <div id="quickbar" class="quickbar" aria-label="快捷物品栏"></div>

      <div class="touch-controls" aria-label="触屏控制">
        <div class="dpad">
          <button data-move="up" aria-label="向上">▲</button>
          <button data-move="left" aria-label="向左">◀</button>
          <button data-move="down" aria-label="向下">▼</button>
          <button data-move="right" aria-label="向右">▶</button>
        </div>
        <div class="touch-actions">
          <button id="touchUse">F<small>使用</small></button>
          <button id="touchInteract" class="primary">E<small>调查</small></button>
        </div>
      </div>

      <aside id="drawer" class="drawer" aria-label="折叠菜单" aria-hidden="true">
        <div class="drawer-head"><div><small>POCKET MENU</small><b>随身背包</b></div><button id="drawerClose" aria-label="关闭菜单">×</button></div>
        <nav class="drawer-tabs" aria-label="菜单分类">
          <button class="active" data-tab="inventory"><span>▣</span>道具</button>
          <button data-tab="journal"><span>▤</span>日志</button>
          <button data-tab="save"><span>▥</span>存档</button>
          <button data-tab="settings"><span>⚙</span>设置</button>
        </nav>
        <section class="drawer-panel active" data-panel="inventory">
          <p class="panel-kicker">本轮携带 · 最多五件</p>
          <div id="inventoryGrid" class="inventory-grid"></div>
        </section>
        <section class="drawer-panel" data-panel="journal">
          <div class="journal-title"><div><small>LIFE LOG</small><b>今天记住的事</b></div><span id="clueCount">0 / 4</span></div>
          <div id="clueList" class="clue-list"></div>
          <div class="death-count">尝试次数 <b id="deathCount">01</b></div>
        </section>
        <section class="drawer-panel" data-panel="save">
          <div class="save-card"><span>☁</span><h3>设备本地存档</h3><p>保存已经发现的线索、尝试次数、通关照片和辅助设置。关卡道具会在死亡后重置。</p><button id="saveButton" class="menu-action">保存生活日志</button><small id="saveStatus">尚未手动保存</small></div>
        </section>
        <section class="drawer-panel" data-panel="settings">
          <label class="setting-row"><div><b>加强危险轮廓</b><small>为风口和坠落区域增加红色边界</small></div><input id="dangerAssist" type="checkbox" /></label>
          <label class="setting-row"><div><b>减少动态效果</b><small>减弱水流、花朵和角色晃动</small></div><input id="reducedMotion" type="checkbox" /></label>
          <div class="controls-list"><b>键盘操作</b><span><kbd>WASD</kbd> / <kbd>方向键</kbd> 移动</span><span><kbd>E</kbd> 调查　<kbd>F</kbd> 使用</span><span><kbd>1–5</kbd> 选择物品　<kbd>B</kbd> 背包</span><span><kbd>R</kbd> 从头重来</span></div>
        </section>
      </aside>

      <div class="overlay active" data-overlay="intro">
        <div class="intro-card">
          <p class="eyebrow">A SMALL THING FOR TODAY</p>
          <span class="chapter-no">03</span>
          <h1>春日花谷</h1>
          <p class="intro-copy">把勿忘我的种子送到山顶小屋。<br>不用走得最快，记得看看沿途的花。</p>
          <div class="intro-rules"><span><i>移动</i> WASD / 方向键</span><span><i>调查</i> E / 空格</span><span><i>背包</i> B</span></div>
          <button id="startButton" class="big-action">开始今天 <span>→</span></button>
          <small>危险都会提前留下迹象。失败后，你会记得已经发现的事。</small>
        </div>
      </div>

      <div class="overlay" data-overlay="death" hidden>
        <div class="death-card">
          <p class="eyebrow danger">THIS DAY ENDED AT <span id="deathTime">09:10</span></p>
          <div class="fallen-flower">✿</div>
          <h2 id="deathCause">这一天停下了</h2>
          <p id="deathLesson"></p>
          <button id="restartButton" class="big-action danger-action">带着记忆重来 <span>↻</span></button>
          <small>已发现的口令线索不会消失。</small>
        </div>
      </div>

      <div class="overlay" data-overlay="code" hidden>
        <div class="code-card">
          <p class="eyebrow">THE COTTAGE DOOR</p>
          <h2>今天的四个数字</h2>
          <div class="code-order"><span>水磨坊</span><span>野餐布</span><span>明信片</span><span>小屋</span></div>
          <input id="codeInput" inputmode="numeric" maxlength="4" readonly aria-label="四位通关口令" />
          <div class="keypad" aria-label="数字键盘">${[1,2,3,4,5,6,7,8,9].map((n) => `<button data-digit="${n}">${n}</button>`).join("")}<button data-key="back">←</button><button data-digit="0">0</button><button data-key="enter">✓</button></div>
          <div class="code-actions"><button id="codeCancel">再想想</button><button id="codeSubmit">确认口令</button></div>
        </div>
      </div>

      <div class="overlay" data-overlay="complete" hidden>
        <div class="complete-card">
          <div class="photo-frame"><div class="photo-sky"></div><div class="photo-hill"></div><span>✿</span></div>
          <p class="eyebrow">TODAY, REMEMBERED</p>
          <h2>门开了，花也开了。</h2>
          <blockquote>“花开的时候，不要只顾着赶路。”</blockquote>
          <div class="stamp"><span>今日印章</span><b>生</b></div>
          <button id="replayButton" class="big-action">再走一次 <span>↻</span></button>
        </div>
      </div>
    </section>

    <footer class="site-footer"><span><kbd>WASD</kbd> 移动　<kbd>E</kbd> 调查　<kbd>F</kbd> 使用　<kbd>B</kbd> 背包</span><span>原型目标：找到 4 个数字并抵达山顶小屋</span></footer>
  </main>
`;

function element<T extends HTMLElement>(selector: string) {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`Missing element: ${selector}`);
  return node;
}

const canvas = element<HTMLCanvasElement>("#gameCanvas");
const timeValue = element("#timeValue");
const objectiveValue = element("#objectiveValue");
const prompt = element("#interactionPrompt");
const quickbar = element("#quickbar");
const inventoryGrid = element("#inventoryGrid");
const clueList = element("#clueList");
const clueCount = element("#clueCount");
const deathCount = element("#deathCount");
const toast = element("#toast");
const drawer = element("#drawer");
const menuButton = element<HTMLButtonElement>("#menuButton");
const dangerAssist = element<HTMLInputElement>("#dangerAssist");
const reducedMotion = element<HTMLInputElement>("#reducedMotion");
const codeInput = element<HTMLInputElement>("#codeInput");
let toastTimer = 0;
let modal: "intro" | "death" | "code" | "complete" | null = "intro";
let latestState: ViewState | undefined;
let drawerOpen = false;

function showToast(message: string) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 4300);
}

function setOverlay(name: typeof modal) {
  modal = name;
  document.querySelectorAll<HTMLElement>("[data-overlay]").forEach((overlay) => {
    const active = overlay.dataset.overlay === name;
    overlay.hidden = !active;
    overlay.classList.toggle("active", active);
  });
}

function iconFor(item: string) {
  return ITEMS[item as keyof typeof ITEMS]?.icon ?? "·";
}

function renderView(state: ViewState) {
  latestState = state;
  timeValue.textContent = state.time;
  objectiveValue.textContent = state.objective;
  prompt.hidden = !state.interaction;
  prompt.textContent = state.interaction ?? "";
  deathCount.textContent = String(Math.max(1, state.deaths + 1)).padStart(2, "0");
  clueCount.textContent = `${state.clues.length} / ${CLUES.length}`;
  dangerAssist.checked = state.dangerAssist;
  reducedMotion.checked = state.reducedMotion;

  quickbar.innerHTML = ITEM_ORDER.map((id, index) => {
    const owned = state.inventory.includes(id);
    return `<button class="quick-slot ${state.selectedSlot === index ? "selected" : ""} ${owned ? "owned" : "empty"}" data-slot="${index}" aria-label="${owned ? ITEMS[id].name : `空物品格 ${index + 1}`}"><span>${owned ? iconFor(id) : ""}</span><small>${index + 1}</small></button>`;
  }).join("");

  inventoryGrid.innerHTML = ITEM_ORDER.map((id) => {
    const owned = state.inventory.includes(id);
    const item = ITEMS[id];
    return `<article class="inventory-item ${owned ? "" : "locked"}"><span>${owned ? item.icon : "?"}</span><div><b>${owned ? item.name : "尚未发现"}</b><small>${owned ? item.description : "继续探索花谷。"}</small></div></article>`;
  }).join("");

  clueList.innerHTML = CLUES.map((clue) => {
    const found = state.clues.includes(clue.id);
    return `<article class="clue-item ${found ? "found" : "missing"}"><span>${found ? clue.digit : "?"}</span><div><b>${found ? clue.title : "一段还没遇见的记忆"}</b><small>${found ? clue.memory : "闪光会在附近轻轻响起。"}</small></div></article>`;
  }).join("");
}

function showDeath(info: DeathInfo) {
  closeDrawer(false);
  element("#deathTime").textContent = info.time;
  element("#deathCause").textContent = info.cause;
  element("#deathLesson").textContent = info.lesson;
  setOverlay("death");
}

const game = new Game(canvas, {
  onViewChange: renderView,
  onMessage: showToast,
  onDeath: showDeath,
  onCodeRequest: () => {
    closeDrawer(false);
    codeInput.value = "";
    setOverlay("code");
  },
  onComplete: () => setOverlay("complete"),
});

function openDrawer() {
  if (modal) return;
  drawerOpen = true;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  menuButton.setAttribute("aria-expanded", "true");
  game.setPaused(true);
}

function closeDrawer(resume = true) {
  drawerOpen = false;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
  if (resume && !modal) game.setPaused(false);
}

element("#startButton").addEventListener("click", () => {
  setOverlay(null);
  game.start();
});
element("#restartButton").addEventListener("click", () => {
  setOverlay(null);
  game.restart();
});
element("#replayButton").addEventListener("click", () => {
  setOverlay(null);
  game.restart();
});
menuButton.addEventListener("click", () => drawerOpen ? closeDrawer() : openDrawer());
element("#drawerClose").addEventListener("click", () => closeDrawer());
element("#touchInteract").addEventListener("click", () => game.interact());
element("#touchUse").addEventListener("click", () => game.useSelected());
element("#saveButton").addEventListener("click", () => {
  game.manualSave();
  element("#saveStatus").textContent = `刚刚保存 · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
});
dangerAssist.addEventListener("change", () => game.setDangerAssist(dangerAssist.checked));
reducedMotion.addEventListener("change", () => game.setReducedMotion(reducedMotion.checked));

quickbar.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-slot]");
  if (button) game.selectSlot(Number(button.dataset.slot));
});

document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
    document.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === button.dataset.tab));
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-move]").forEach((button) => {
  const direction = button.dataset.move as Direction;
  const press = (event: Event) => {
    event.preventDefault();
    game.setMovement(direction, true);
  };
  const release = (event: Event) => {
    event.preventDefault();
    game.setMovement(direction, false);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});

function addDigit(digit: string) {
  if (codeInput.value.length < PASSCODE.length) codeInput.value += digit;
}

function submitCode() {
  if (!game.submitCode(codeInput.value)) {
    codeInput.classList.remove("shake");
    void codeInput.offsetWidth;
    codeInput.classList.add("shake");
  }
}

document.querySelectorAll<HTMLButtonElement>("[data-digit]").forEach((button) => button.addEventListener("click", () => addDigit(button.dataset.digit ?? "")));
element("[data-key='back']").addEventListener("click", () => { codeInput.value = codeInput.value.slice(0, -1); });
element("[data-key='enter']").addEventListener("click", submitCode);
element("#codeSubmit").addEventListener("click", submitCode);
element("#codeCancel").addEventListener("click", () => {
  setOverlay(null);
  game.cancelCode();
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (modal === "code") {
    if (/^\d$/.test(key)) addDigit(key);
    if (key === "backspace") codeInput.value = codeInput.value.slice(0, -1);
    if (key === "enter") submitCode();
    if (key === "escape") {
      setOverlay(null);
      game.cancelCode();
    }
    return;
  }
  if (!modal && (key === "b" || key === "escape")) {
    event.preventDefault();
    drawerOpen ? closeDrawer() : openDrawer();
  }
});

window.addEventListener("pointerup", () => {
  (["up", "down", "left", "right"] as Direction[]).forEach((direction) => game.setMovement(direction, false));
});

if (latestState?.completed) showToast("这一天已经完成过。你仍然可以再走一次。");
