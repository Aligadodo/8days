import "./style.css";
import { AudioManager, type AudioBus, type AudioEventId } from "./audio/AudioManager";
import { ACHIEVEMENTS, CLUES, DISCOVERIES, ITEMS, ITEM_ORDER, PASSCODE } from "./game/content";
import { Game } from "./game/Game";
import type { DeathInfo, Direction, ViewState } from "./game/types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = `
  <main class="app-shell">
    <header class="site-header">
      <div class="wordmark"><span class="wordmark-flower">✦</span><div><b>今天，也要好好活着</b><small>ONE MORE DAY · PLAYABLE PROTOTYPE</small></div></div>
      <div class="prototype-chip"><i></i> 春日花谷 · 原型 0.4</div>
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
      <div id="soundCaption" class="sound-caption" role="status" aria-live="polite" hidden></div>

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
          <div class="journal-title"><div><small>LIFE LOG</small><b>今天记住的事</b></div><span id="journalProgress">0%</span></div>
          <div class="journal-section-head"><b>今日任务</b><small>主线与小事</small></div>
          <div id="taskList" class="task-list"></div>
          <div class="journal-section-head"><b>口令线索</b><small id="clueCount">0 / 4</small></div>
          <div id="clueList" class="clue-list"></div>
          <div class="journal-section-head"><b>自然发现</b><small id="discoveryCount">0 / 5</small></div>
          <div id="discoveryGrid" class="discovery-grid"></div>
          <div class="journal-section-head"><b>小小成就</b><small id="achievementCount">0 / 9</small></div>
          <div id="achievementGrid" class="achievement-grid"></div>
          <div class="death-count">尝试次数 <b id="deathCount">01</b></div>
        </section>
        <section class="drawer-panel" data-panel="save">
          <div class="save-card"><span>☁</span><h3>设备本地存档</h3><p>保存已经发现的线索、尝试次数、通关照片和辅助设置。关卡道具会在死亡后重置。</p><button id="saveButton" class="menu-action">保存生活日志</button><small id="saveStatus">尚未手动保存</small></div>
        </section>
        <section class="drawer-panel" data-panel="settings">
          <label class="setting-row"><div><b>加强危险轮廓</b><small>为风口和坠落区域增加红色边界</small></div><input id="dangerAssist" type="checkbox" /></label>
          <label class="setting-row"><div><b>减少动态效果</b><small>减弱水流、花朵和角色晃动</small></div><input id="reducedMotion" type="checkbox" /></label>
          <div class="audio-settings">
            <div class="setting-section-title"><b>声音</b><small>音乐负责情绪，环境声负责空间</small></div>
            <label class="volume-row"><span>主音量</span><input data-audio-volume="master" type="range" min="0" max="100" step="5" /><output></output></label>
            <label class="volume-row"><span>音乐</span><input data-audio-volume="music" type="range" min="0" max="100" step="5" /><output></output></label>
            <label class="volume-row"><span>效果</span><input data-audio-volume="effects" type="range" min="0" max="100" step="5" /><output></output></label>
            <label class="volume-row"><span>环境</span><input data-audio-volume="ambience" type="range" min="0" max="100" step="5" /><output></output></label>
            <label class="setting-row compact"><div><b>重要声音字幕</b><small>显示谜题和危险声音的方向</small></div><input id="soundCaptions" type="checkbox" /></label>
            <label class="setting-row compact"><div><b>单声道</b><small>取消左右声像，保留视觉方向提示</small></div><input id="monoAudio" type="checkbox" /></label>
          </div>
          <div class="signal-legend"><b>世界光边</b><span><i class="story"></i>主线</span><span><i class="utility"></i>工具</span><span><i class="optional"></i>小事</span><span><i class="discovery"></i>观察</span></div>
          <div class="controls-list"><b>操作方式</b><span><kbd>左键</kbd> 点地移动，按住可持续跟随</span><span><kbd>左键</kbd> 点击闪光物，自动走近调查</span><span><kbd>右键</kbd> 取消移动　<kbd>B</kbd> 背包</span><span><kbd>WASD</kbd> 备用移动　<kbd>E</kbd> 调查</span></div>
        </section>
      </aside>

      <div class="overlay active" data-overlay="intro">
        <div class="intro-card">
          <p class="eyebrow">A SMALL THING FOR TODAY</p>
          <span class="chapter-no">03</span>
          <h1>春日花谷</h1>
          <p class="intro-copy">把勿忘我的种子送到山顶小屋。<br>不用走得最快，记得看看沿途的花。</p>
          <div class="intro-rules"><span><i>移动</i> 左键点地 / 按住</span><span><i>调查</i> 点击闪光目标</span><span><i>备用</i> WASD / E</span></div>
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
          <h2>让门想起今天</h2>
          <p class="code-hint">按门框从左到右的图案，把日志里的四段记忆放回原位。</p>
          <div class="code-order"><span data-code-index="0"><i>◉</i>水轮</span><span data-code-index="1"><i>杯</i>茶杯</span><span data-code-index="2"><i>✿</i>花信</span><span data-code-index="3"><i>⌂</i>屋檐</span></div>
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

    <footer class="site-footer"><span><kbd>左键</kbd> 点击移动 / 调查　<kbd>右键</kbd> 取消　<kbd>WASD</kbd> 备用</span><span>原型目标：理解环境规律，解开 4 段生活线索</span></footer>
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
const soundCaption = element("#soundCaption");
const quickbar = element("#quickbar");
const inventoryGrid = element("#inventoryGrid");
const taskList = element("#taskList");
const clueList = element("#clueList");
const clueCount = element("#clueCount");
const journalProgress = element("#journalProgress");
const discoveryGrid = element("#discoveryGrid");
const discoveryCount = element("#discoveryCount");
const achievementGrid = element("#achievementGrid");
const achievementCount = element("#achievementCount");
const deathCount = element("#deathCount");
const toast = element("#toast");
const drawer = element("#drawer");
const menuButton = element<HTMLButtonElement>("#menuButton");
const dangerAssist = element<HTMLInputElement>("#dangerAssist");
const reducedMotion = element<HTMLInputElement>("#reducedMotion");
const soundCaptions = element<HTMLInputElement>("#soundCaptions");
const monoAudio = element<HTMLInputElement>("#monoAudio");
const codeInput = element<HTMLInputElement>("#codeInput");
let toastTimer = 0;
let captionTimer = 0;
let modal: "intro" | "death" | "code" | "complete" | null = "intro";
let latestState: ViewState | undefined;
let drawerOpen = false;

function showToast(message: string) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 4300);
}

function showSoundCaption(message: string, pan: number) {
  const direction = pan < -0.22 ? "左侧" : pan > 0.22 ? "右侧" : "附近";
  soundCaption.textContent = `〔${direction}：${message}〕`;
  soundCaption.hidden = false;
  soundCaption.classList.remove("visible");
  void soundCaption.offsetWidth;
  soundCaption.classList.add("visible");
  window.clearTimeout(captionTimer);
  captionTimer = window.setTimeout(() => {
    soundCaption.classList.remove("visible");
    soundCaption.hidden = true;
  }, 3200);
}

const audio = new AudioManager(showSoundCaption);
const initialAudioSettings = audio.getSettings();

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
  discoveryCount.textContent = `${state.discoveries.length} / ${DISCOVERIES.length}`;
  achievementCount.textContent = `${state.achievements.length} / ${ACHIEVEMENTS.length}`;
  const journalDone = state.clues.length + state.discoveries.length + state.achievements.length;
  const journalTotal = CLUES.length + DISCOVERIES.length + ACHIEVEMENTS.length;
  journalProgress.textContent = `${Math.round(journalDone / journalTotal * 100)}%`;
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

  taskList.innerHTML = state.tasks.map((task) => `
    <article class="task-item ${task.done ? "done" : ""} ${task.optional ? "optional" : "main"}">
      <span>${task.done ? "✓" : task.optional ? "·" : "★"}</span>
      <div><div class="task-title"><b>${task.title}</b><small>${task.progress}</small></div><p>${task.detail}</p></div>
    </article>
  `).join("");

  discoveryGrid.innerHTML = DISCOVERIES.map((discovery) => {
    const found = state.discoveries.includes(discovery.id);
    return `<article class="discovery-item ${found ? "found" : "locked"}" title="${found ? discovery.note : "在花谷中寻找带粉色光边的小生命"}"><span>${found ? discovery.icon : "?"}</span><b>${found ? discovery.title : "等待观察"}</b></article>`;
  }).join("");

  achievementGrid.innerHTML = ACHIEVEMENTS.map((achievement) => {
    const unlocked = state.achievements.includes(achievement.id);
    return `<article class="achievement-item ${unlocked ? "unlocked" : "locked"}" title="${achievement.description}"><span>${unlocked ? achievement.icon : "·"}</span><b>${achievement.title}</b></article>`;
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
    renderCodeProgress();
    setOverlay("code");
  },
  onComplete: () => setOverlay("complete"),
  onAudio: (cue) => audio.play(cue),
});

function openDrawer() {
  if (modal) return;
  drawerOpen = true;
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  menuButton.setAttribute("aria-expanded", "true");
  game.setPaused(true);
  audio.play({ id: "ui.drawer.open" });
}

function closeDrawer(resume = true) {
  const wasOpen = drawerOpen;
  drawerOpen = false;
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  menuButton.setAttribute("aria-expanded", "false");
  if (resume && !modal) game.setPaused(false);
  if (wasOpen) audio.play({ id: "ui.drawer.close" });
}

element("#startButton").addEventListener("click", () => {
  void audio.unlock().then(() => {
    audio.startAmbience();
    audio.play({ id: "music.spring.intro" });
  });
  setOverlay(null);
  game.start();
});
element("#restartButton").addEventListener("click", () => {
  audio.play({ id: "music.spring.intro" });
  setOverlay(null);
  game.restart();
});
element("#replayButton").addEventListener("click", () => {
  audio.play({ id: "music.spring.intro" });
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
soundCaptions.checked = initialAudioSettings.captions;
monoAudio.checked = initialAudioSettings.mono;
soundCaptions.addEventListener("change", () => audio.setCaptions(soundCaptions.checked));
monoAudio.addEventListener("change", () => audio.setMono(monoAudio.checked));

document.querySelectorAll<HTMLInputElement>("[data-audio-volume]").forEach((input) => {
  const bus = input.dataset.audioVolume as "master" | AudioBus;
  const output = input.parentElement?.querySelector("output");
  const value = Math.round(initialAudioSettings[bus] * 100);
  input.value = String(value);
  if (output) output.textContent = `${value}%`;
  input.addEventListener("input", () => {
    const next = Number(input.value);
    audio.setVolume(bus, next / 100);
    if (output) output.textContent = `${next}%`;
  });
});

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
  if (codeInput.value.length >= PASSCODE.length) return;
  const memoryEvents: AudioEventId[] = ["memory.wheel", "memory.cup", "memory.flower", "memory.home"];
  audio.play({ id: memoryEvents[codeInput.value.length] });
  codeInput.value += digit;
  renderCodeProgress();
}

function renderCodeProgress() {
  document.querySelectorAll<HTMLElement>("[data-code-index]").forEach((item) => {
    item.classList.toggle("remembered", Number(item.dataset.codeIndex) < codeInput.value.length);
  });
}

function submitCode() {
  if (!game.submitCode(codeInput.value)) {
    codeInput.classList.remove("shake");
    void codeInput.offsetWidth;
    codeInput.classList.add("shake");
    window.setTimeout(() => {
      codeInput.value = "";
      renderCodeProgress();
    }, 520);
  }
}

document.querySelectorAll<HTMLButtonElement>("[data-digit]").forEach((button) => button.addEventListener("click", () => addDigit(button.dataset.digit ?? "")));
element("[data-key='back']").addEventListener("click", () => {
  codeInput.value = codeInput.value.slice(0, -1);
  renderCodeProgress();
});
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
    if (key === "backspace") {
      codeInput.value = codeInput.value.slice(0, -1);
      renderCodeProgress();
    }
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

document.addEventListener("visibilitychange", () => audio.setSuspended(document.hidden));

document.addEventListener("pointerdown", (event) => {
  const button = (event.target as HTMLElement).closest("button");
  if (!button || button.classList.contains("quick-slot")) return;
  void audio.unlock().then(() => audio.play({ id: "ui.click.soft" }));
});

if (latestState?.completed) showToast("这一天已经完成过。你仍然可以再走一次。");
