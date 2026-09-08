import "./style.css";
import { AudioManager, type AudioBus } from "./audio/AudioManager";
import { CampaignGame } from "./campaign/CampaignGame";
import { shuffledOptions } from "./campaign/puzzleLogic";
import { gameTime } from "./campaign/hazardDirector";
import { CAMPAIGN_PHRASE, LEVELS } from "./campaign/levels";
import { canOpenDrawer, hasVisibleModal, trapModalTab } from "./ui/modalState";
import type { EconomyView, EconomyResult } from "./campaign/life/economy";
import { ITEMS, MAX_COINS } from "./campaign/life/catalog";
import { drawerRoute, achievementCards, filterAchievements, showLifeGuide, nextDrawerFocusIndex, transactionFocusKeys, lifeGuideBottom, type DrawerDestination, type AchievementFilter } from "./ui/lifeNavigation";
import type {
  CampaignView,
  LevelDefinition,
  PuzzleSpec,
} from "./campaign/types";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App root not found");

app.innerHTML = `
  <main class="app-shell">
    <header class="site-header">
      <div class="wordmark"><span>✦</span><div><b>今天，也要好好活着</b><small>ONE MORE DAY · 八日正式内容版</small></div></div>
      <div class="release-chip"><i></i> LIVING WORLD 0.16.0</div>
    </header>
    <section id="gameFrame" class="game-frame" aria-label="八日旅程游戏区域">
      <canvas id="gameCanvas" tabindex="0" aria-label="Q版像素风探索地图"></canvas>
      <div id="doorOverlay" class="overlay" role="dialog" aria-modal="true" aria-labelledby="doorTitle" hidden><div class="door-card pixel-panel"><small>一扇门，两种发现</small><h2 id="doorTitle"></h2><p>可以先进去逛逛，也可以调查门旁的主线物件。自由探索不影响今天的任务。</p><button id="doorEnter" class="primary-action">进入室内</button><button id="doorInspect" class="secondary-action">调查门旁物件</button><button id="doorCancel" class="secondary-action">暂时离开</button></div></div>
      <div class="hud-top">
        <div class="day-card pixel-panel"><span id="weatherIcon">☂</span><div><b id="dayValue">DAY 01</b><small id="timeValue">07:18</small></div></div>
        <div class="mission-stack">
          <button id="objectiveButton" class="objective-card pixel-panel" aria-expanded="false"><span class="objective-star">✦</span><span><small id="progressValue">主线 0 / 4</small><b id="objectiveValue">找到第一处线索</b></span><i>⌄</i></button>
          <div id="guideCard" class="guide-card pixel-panel collapsed"><div><span class="guide-label">现在做什么</span><p id="guideReason">鼠标停在物件上时显示细光边；点击后自动靠近调查。</p></div><button id="locateButton">在小地图定位</button><button id="roomButton" hidden>寻找可进入的房间</button><button id="fieldHintButton">给我一点提示 <span>1/3</span></button><p id="fieldHint" class="field-hint" hidden></p></div>
        </div>
        <div class="hud-actions"><button id="fullscreenButton" class="icon-button pixel-panel" aria-label="进入全屏" title="全屏">⛶</button><button id="menuButton" class="icon-button pixel-panel readable-menu" aria-label="打开背包与商店" aria-expanded="false" title="背包与商店"><span aria-hidden="true">▣</span><b>背包 / 商店</b></button></div>
      </div>
      <div id="routeHelp" class="route-help">点击地面移动 · 悬停物件描边 · 右键停下</div>
      <aside id="minimap" class="minimap" aria-label="探索地图"><button id="minimapToggle" aria-expanded="true" aria-label="折叠探索地图"><span id="regionName">街口</span><span>−</span></button><canvas id="minimapCanvas" width="280" height="158" aria-label="探索过的区域、当前位置与方向。点击已探索地面可以前往。"></canvas><small>▲ 你在这里 · 深色为未探索</small></aside>
      <div id="quickbar" class="quickbar" aria-label="本关获得的物品"></div>
      <aside id="lifeOnboarding" class="life-onboarding pixel-panel" aria-label="生活玩法引导" hidden><button id="dismissLifeGuide" class="life-guide-close" aria-label="关闭生活玩法引导">×</button><b>主线之外，还可以这样玩</b><p>收集物资 → 背包出售 → 商店补给 → 结识伙伴、达成成就</p><div><button data-guide-action="collect">找可收集物</button><button data-guide-action="inventory">背包出售</button><button data-guide-action="shop">逛商店</button><button data-guide-action="companions">伙伴</button><button data-guide-action="achievements">成就</button></div></aside>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
      <div id="soundCaption" class="sound-caption" role="status" aria-live="polite" hidden></div>
      <aside id="drawer" class="drawer" aria-hidden="true" inert>
        <div class="drawer-head"><div><small>POCKET MENU</small><b id="drawerTitle">随身背包</b></div><button id="drawerClose" aria-label="关闭">×</button></div>
        <nav class="drawer-tabs" aria-label="背包功能"><button class="active" data-tab="inventory">▣<span>背包</span></button><button data-tab="shop">◈<span>商店</span></button><button data-tab="companions">♧<span>伙伴</span></button><button data-tab="achievements">✦<span>成就</span></button><button data-tab="more">⋯<span>更多</span></button></nav>
        <section class="drawer-panel active" data-panel="inventory"><div class="economy-wallet"><b><span aria-hidden="true">◉</span> <span id="coinBalance">0</span> 金币</b><small id="partySummary">暂无出战伙伴</small></div><nav class="life-tabs" aria-label="背包内容"><button data-life-tab="supplies" class="active" aria-pressed="true">物资</button><button data-life-tab="exchange" aria-pressed="false">兑换</button><button data-life-tab="pets" aria-pressed="false">伙伴</button><button data-life-tab="memories" aria-pressed="false">线索</button></nav><p id="economyFeedback" class="economy-feedback" role="status" aria-live="polite" hidden></p><div id="economyContent"></div><div id="memoryInventory" hidden><div class="section-title"><small>FOUND TODAY</small><b>今天的任务线索与收藏</b></div><p class="economy-help">主线工具与生活册收藏不可出售或消耗。</p><div id="inventoryGrid" class="inventory-grid"></div></div><details class="backpack-rules"><summary>背包规则</summary><p>物资跨日共用，每类最多999份；金币仅用于游戏，不涉及现实支付。箱子只取一次，采集按在线探索时间再生，暂停和离线不计时。</p><p>同类补给替换强度并重新计时，不叠加；关闭背包后开始计时。速度补给不免伤、不替你避险。</p><p>最多拥有12只伙伴、3只同时跟随。同种可重复领养，购买后自行安排出战；主线线索和纪念收藏不可出售。</p></details></section>
        <section class="drawer-panel" data-panel="journal"><div class="section-title"><small>LIFE LOG</small><b id="journalTitle">DAY 01 · 暴雨通勤</b></div><div class="journal-progress"><span id="journalBar"></span></div><div class="journal-block"><b>主线推理</b><div id="clueList" class="clue-list"></div></div><div class="journal-block"><b>顺手做的小事</b><div id="sideList" class="side-list"></div></div><div class="journal-block"><b>八日印章</b><div id="stampList" class="stamp-list"></div></div></section>
        <section class="drawer-panel" data-panel="save"><div class="save-card"><span>☁</span><h3>设备本地存档</h3><p>谜题线索、死亡后的经验、支线与已解锁关卡都会自动保存。</p><button id="saveButton" class="menu-action">立即保存生活日志</button><small id="saveStatus">自动保存已开启</small></div><button id="campaignButton" class="secondary-action">返回八日旅程</button><button id="resetSaveButton" class="secondary-action reset-action">重置全部战役进度</button></section>
        <section class="drawer-panel" data-panel="settings"><label class="setting-row"><div><b>加强危险轮廓</b><small>始终显示危险区域边界</small></div><input id="dangerAssist" type="checkbox"></label><label class="setting-row"><div><b>减少动态效果</b><small>关闭晃动、漂浮和呼吸动画</small></div><input id="reducedMotion" type="checkbox"></label><label class="setting-row"><div><b>声音字幕</b><small>把重要方向声转成画面提示</small></div><input id="soundCaptions" type="checkbox"></label><label class="setting-row"><div><b>单声道</b><small>取消左右声像</small></div><input id="monoAudio" type="checkbox"></label><div class="volume-list"><label><span>主音量</span><input data-volume="master" type="range" min="0" max="100" step="5"><output></output></label><label><span>音乐</span><input data-volume="music" type="range" min="0" max="100" step="5"><output></output></label><label><span>音效</span><input data-volume="effects" type="range" min="0" max="100" step="5"><output></output></label><label><span>环境</span><input data-volume="ambience" type="range" min="0" max="100" step="5"><output></output></label></div><div class="legend"><b>光边含义</b><span><i class="main"></i>主线</span><span><i class="side"></i>小事</span><span><i class="done"></i>完成</span></div></section>
        <section class="drawer-panel" data-panel="achievements"><div class="achievement-overview"><b id="achievementSummary">旅行成就</b><p>八日累计与本日地方成就都在这里。</p></div><nav class="achievement-filters" aria-label="筛选成就"><button data-achievement-filter="all" class="active" aria-pressed="true">全部</button><button data-achievement-filter="pending" aria-pressed="false">未完成</button><button data-achievement-filter="done" aria-pressed="false">已完成</button></nav><div id="achievementCards" class="achievement-cards"></div></section>
        <section class="drawer-panel" data-panel="more"><div class="more-routes"><button data-drawer-target="memories"><b>任务线索与收藏</b><small>主线记忆、工具与纪念物</small></button><button data-drawer-target="journal"><b>生活日志</b><small>谜题证据、发现、小事与八日印章</small></button><button data-drawer-target="save"><b>存档与旅程</b><small>立即保存、返回关卡选择</small></button><button data-drawer-target="settings"><b>声音与辅助设置</b><small>全局音量、字幕、危险辅助</small></button><button id="restoreLifeGuide"><b>再看生活玩法引导</b><small>收集、出售、商店、伙伴与成就</small></button></div></section>
      </aside>
      <div id="campaignOverlay" class="overlay active"><div class="campaign-card"><div class="campaign-copy"><p class="eyebrow">EIGHT ORDINARY DAYS</p><h1>八日旅程</h1><p>死亡不是猜拳。观察环境的提前迹象，记住失败带来的知识，再把今天认真走完。</p><div class="phrase-preview"><small>最终日记</small><b id="phrasePreview">＿＿＿＿，＿＿＿＿</b></div></div><div id="levelGrid" class="level-grid"></div><div id="levelBrief" class="level-brief"></div></div></div>
      <div id="puzzleOverlay" class="overlay" hidden><div class="puzzle-card"><button id="puzzleClose" class="modal-close" aria-label="暂时离开谜题">×</button><div class="puzzle-heading"><span id="puzzleIcon">◉</span><div><p class="eyebrow" id="puzzleType">SEQUENCE</p><h2 id="puzzleTitle">谜题</h2></div></div><p id="puzzleStory" class="puzzle-story"></p><div class="evidence-board"><b>现场观察</b><div id="evidenceList"></div></div><div class="solve-board"><b id="puzzleInstruction"></b><div id="puzzleControls"></div><p id="puzzleFeedback" class="puzzle-feedback" aria-live="polite"></p></div><div class="hint-ladder"><button id="puzzleHintButton">拆开一层提示 <span>0 / 3</span></button><p id="puzzleHintText">提示会逐层从“注意什么”推进到“具体怎么做”。</p></div></div></div>
      <div id="codeOverlay" class="overlay" hidden><div class="code-card"><button id="codeClose" class="modal-close" aria-label="离开口令门">×</button><p class="eyebrow">FINAL DEDUCTION</p><h2>把今天放回正确顺序</h2><p>数字不是直接抄来的。先按终点门框上的符号顺序，再查日志中每个符号对应的数字。</p><div id="codeOrder" class="code-order"></div><input id="codeInput" maxlength="4" inputmode="numeric" aria-label="四位通关口令" autocomplete="off"><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => `<button data-digit="${digit}">${digit}</button>`).join("")}<button data-key="back">←</button><button data-digit="0">0</button><button data-key="enter">✓</button></div><p id="codeFeedback" class="puzzle-feedback" aria-live="polite"></p></div></div>
      <div id="deathOverlay" class="overlay" hidden><div class="death-card"><p class="eyebrow danger">THIS DAY ENDED AT <span id="deathTime"></span></p><div class="fallen-flower">✿</div><h2 id="deathCause">这一天停下了</h2><p id="deathSequence" class="death-sequence"></p><p id="deathLesson"></p><div class="memory-kept">已解开的主线线索会保留。你失去的是这次路程，不是学到的经验。</div><button id="restartButton" class="primary-action">带着记忆重来 <span>↻</span></button></div></div>
      <div id="completeOverlay" class="overlay" hidden><div class="complete-card"><p class="eyebrow">DAY COMPLETE</p><span id="completeStamp" class="big-stamp">好</span><h2 id="completeTitle"></h2><p id="completeEnding"></p><div id="completeStats" class="complete-stats"></div><div class="complete-actions"><button id="nextLevelButton" class="primary-action">进入下一天 →</button><button id="backCampaignButton" class="secondary-action">八日旅程</button></div></div></div>
    </section>
  </main>`;

const byId = <T extends HTMLElement>(id: string) => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing #${id}`);
  return element as T;
};

const canvas = byId<HTMLCanvasElement>("gameCanvas");
const gameFrame = byId<HTMLElement>("gameFrame");
const drawer = byId<HTMLElement>("drawer");
const campaignOverlay = byId<HTMLElement>("campaignOverlay");
const puzzleOverlay = byId<HTMLElement>("puzzleOverlay");
const codeOverlay = byId<HTMLElement>("codeOverlay");
const deathOverlay = byId<HTMLElement>("deathOverlay");
const completeOverlay = byId<HTMLElement>("completeOverlay");
const toast = byId<HTMLElement>("toast");
const soundCaption = byId<HTMLElement>("soundCaption");
document.querySelector<HTMLElement>(".life-tabs")!.hidden = true;
let toastTimer = 0;
let captionTimer = 0;
let currentView: CampaignView | null = null;
let activePuzzle: PuzzleSpec | null = null;
let sequenceInput: string[] = [];
let patternInput: string[] = [];
let puzzleHintStage = 0;
let selectedLevel = 0;
let puzzleOptions: string[] = [];
let puzzleCompleting = false;
let contentSignature = "";
let economySignature = "";
let lifeTab: "supplies" | "exchange" | "pets" | "memories" = "supplies";
let selectedSupplyId = "trail-snack";
let drawerDestination: DrawerDestination = "inventory";
let achievementFilter: AchievementFilter = "all";
let lifeGuideDismissed = false;
try { lifeGuideDismissed = localStorage.getItem("one-more-day:life-guide-016") === "dismissed"; } catch { /* Optional UI preference. */ }
const tradeQuantities: Record<string, number> = {};

const audio = new AudioManager((caption, pan) => {
  soundCaption.textContent = `${pan < -0.25 ? "◀ " : pan > 0.25 ? "▶ " : ""}${caption}`;
  soundCaption.hidden = false;
  soundCaption.classList.add("show");
  window.clearTimeout(captionTimer);
  captionTimer = window.setTimeout(() => {
    soundCaption.classList.remove("show");
    soundCaption.hidden = true;
  }, 2600);
});

const showToast = (
  message: string,
  tone: "normal" | "success" | "danger" = "normal",
) => {
  toast.textContent = message;
  toast.className = `toast show ${tone}`;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3300);
};
const showOverlay = (element: HTMLElement) => {
  element.hidden = false;
  requestAnimationFrame(() => element.classList.add("active"));
};
const hideOverlay = (element: HTMLElement) => {
  element.classList.remove("active");
  window.setTimeout(() => {
    element.hidden = true;
  }, 180);
};
let game!: CampaignGame;

const updateView = (view: CampaignView) => {
  currentView = view;
  byId("weatherIcon").textContent = view.level.weatherIcon;
  byId("dayValue").textContent =
    `DAY ${String(view.level.day).padStart(2, "0")}`;
  byId("timeValue").textContent = gameTime(
    view.level.startTime,
    view.elapsedSeconds,
  );
  let lifeStatus = document.getElementById("lifeStatus");
  if (!lifeStatus) { lifeStatus = document.createElement("p"); lifeStatus.id = "lifeStatus"; lifeStatus.className = "economy-help"; byId("economyFeedback").after(lifeStatus); }
  lifeStatus.textContent = `${view.life.paceSeconds ? `轻快步行 ${view.life.paceSeconds}s` : "暂无步行加成"}${view.life.petCallSeconds ? ` · 伙伴靠近 ${view.life.petCallSeconds}s` : ""} · 背包内暂停计时`;
  byId("progressValue").textContent =
    `主线 ${view.solved.length} / ${view.level.puzzles.length}`;
  byId("objectiveValue").textContent = view.objective;
  const current = view.currentPuzzle;
  byId("guideReason").textContent =
    (view.exploration.roomId ? `这里是${view.exploration.sceneName}。收藏、打卡与修复都属于自由探索；点原门可返回，日志记录线索和地方成就。` : undefined) ?? view.accessHint ??
    (current
      ? `寻找“${current.title}”。鼠标悬停时物件会描边，点击后自动靠近。需要找路时可以在小地图定位。`
      : "四段记忆已经齐全。前往终点，现场可以展开记忆卡核对符号。");
  renderFieldHint();
  byId("roomButton").hidden = !view.exploration.roomName;
  byId("roomButton").textContent = view.exploration.roomId ? "走到出口，返回大地图" : `自由探索 · 前往${view.exploration.roomName}`;
  const signature = `${view.level.id}:${view.solved.join(",")}:${view.sideTasks.join(",")}:${view.worldFlags.join(",")}:${view.completed}:${view.exploration.flags.join(",")}:${view.exploration.roomId}:${view.exploration.visited}`;
  if (signature !== contentSignature) {
    contentSignature = signature;
    renderInventory(view);
    renderJournal(view);
    renderAchievementPage(view);
  }
  const nextEconomySignature = JSON.stringify(view.economy);
  if (nextEconomySignature !== economySignature) {
    economySignature = nextEconomySignature;
    renderEconomy(view.economy);
    renderEconomyAchievements(view.economy);
    renderAchievementPage(view);
  }
  renderNearbySupplies(view);
  refreshLifeGuide();
};

game = new CampaignGame(canvas, {
  onDoorChoice: (title, enter, inspect) => {
    const overlay = byId("doorOverlay");
    byId("doorTitle").textContent = title;
    const choose = (action: () => void) => { overlay.hidden = true; overlay.classList.remove("active"); action(); };
    byId("doorEnter").onclick = () => choose(enter);
    byId("doorInspect").onclick = () => choose(inspect);
    byId("doorCancel").onclick = () => choose(() => { game.setPaused(false); canvas.focus(); });
    showOverlay(overlay); byId("doorEnter").focus();
  },
  onView: updateView,
  onToast: showToast,
  onPuzzle: openPuzzle,
  onFinal: openCode,
  onDeath: (info) => {
    byId("deathTime").textContent = info.time;
    byId("deathCause").textContent = info.cause;
    byId("deathLesson").textContent = info.lesson;
    byId("deathSequence").textContent = info.sequence ?? "";
    showOverlay(deathOverlay);
    byId("restartButton").focus();
  },
  onCinematic: (active) => {
    gameFrame.classList.toggle("cinematic", active);
    [".hud-top", "#quickbar", "#minimap"].forEach((selector) => {
      const element = gameFrame.querySelector<HTMLElement>(selector);
      if (element) element.inert = active;
    });
    if (active) {
      window.clearTimeout(toastTimer);
      toast.classList.remove("show");
    } else {
      window.clearTimeout(captionTimer);
      soundCaption.hidden = true;
      soundCaption.classList.remove("show");
    }
    audio.setCinematic(active);
  },
  onComplete: (level, view) => openComplete(level, view),
  onAudio: (cue) => audio.play(cue),
});

function renderCampaign() {
  const save = game.getSave();
  const levelGrid = byId("levelGrid");
  levelGrid.innerHTML = LEVELS.map((level, index) => {
    const locked = index >= save.unlocked;
    const complete = save.completed.includes(level.id);
    const progress = save.levels[level.id]?.solved.length ?? 0;
    return `<button class="level-tile ${selectedLevel === index ? "selected" : ""} ${locked ? "locked" : ""} ${complete ? "complete" : ""}" style="--level-art:url('${level.background}')" data-level="${index}" ${locked ? "disabled" : ""}><span class="level-day">${String(level.day).padStart(2, "0")}</span><i>${complete ? level.stamp : locked ? "锁" : level.weatherIcon}</i><b>${level.name}</b><small>${complete ? "已完成" : locked ? "完成前一天解锁" : `${progress}/4 线索`}</small></button>`;
  }).join("");
  levelGrid
    .querySelectorAll<HTMLButtonElement>("[data-level]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        selectedLevel = Number(button.dataset.level);
        audio.play({ id: "ui.click.soft" });
        renderCampaign();
      }),
    );
  const level = LEVELS[selectedLevel];
  const isComplete = save.completed.includes(level.id);
  byId("levelBrief").innerHTML =
    `<div><small>DAY ${String(level.day).padStart(2, "0")} · ${level.subtitle}</small><h2>${level.name}</h2><p>${level.intro}</p><span><b>今日目的</b>${level.goal}</span></div><button id="startLevelButton" class="primary-action">${isComplete ? "重新走这一天" : "开始今天"} →</button>`;
  byId("startLevelButton").addEventListener("click", () => {
    void audio.unlock().then(() => audio.startAmbience());
    game.startLevel(selectedLevel, isComplete);
    hideOverlay(campaignOverlay);
  });
  byId("phrasePreview").textContent =
    save.stamps.length === LEVELS.length
      ? CAMPAIGN_PHRASE
      : `${save.stamps.join("")}${"＿".repeat(LEVELS.length - save.stamps.length)}`;
}

function renderInventory(view: CampaignView) {
  const found = view.level.puzzles.filter((q) => view.solved.includes(q.id));
  byId("inventoryGrid").innerHTML =
    found.length || view.worldItems.length
      ? found
          .map(
            (q) =>
              `<div class="inventory-item"><span>${q.icon}</span><b>${q.rewardItem}</b><small>${q.symbol}＝${q.rewardDigit} · 终点记忆</small></div>`,
          )
          .join("") +
        view.worldItems
          .map(
            (item) =>
              `<div class="inventory-item"><span>◇</span><b>${item}</b><small>${item.includes("小锤") ? "靠近裂墙后点击使用 · 不消耗" : "探索收藏 · 已记入生活日志"}</small></div>`,
          )
          .join("")
      : `<div class="empty-state"><span>◇</span><p>背包还是空的。<br>调查真实物件，收集今天的线索。</p></div>`;
  if (view.exploration.items.length) {
    byId("inventoryGrid").querySelector(".empty-state")?.remove();
    byId("inventoryGrid").insertAdjacentHTML("beforeend", view.exploration.items.map(item =>
      `<div class="inventory-item collection-item"><span>${item.category === "nature" ? "❧" : item.category === "postcard" ? "▧" : item.category === "tool" ? "⚒" : "◇"}</span><b>${item.title}</b><small>自由探索 · ${item.category === "tool" ? "可重复使用，不消耗" : "已收藏，不必重复拾取"}</small></div>`).join(""));
  }
  byId("quickbar").innerHTML = [0, 1, 2, 3, 4]
    .map((index) => {
      const q = found[index];
      return `<button class="quick-slot ${q || index === 4 ? "filled" : ""} ${index === 4 ? "achievement-slot" : ""}" aria-label="${index === 4 ? "查看成就" : q ? `查看${q.rewardItem}` : "空道具格"}" ${!q && index !== 4 ? "disabled" : ""} data-pocket="${index === 4 ? "achievements" : "memories"}"><small>${index === 4 ? "✦" : index + 1}</small>${index === 4 ? "<span>✦</span><b>成就</b>" : q ? `<span>${q.icon}</span><b>${q.rewardItem}</b>` : ""}</button>`;
    })
    .join("");
  byId("quickbar")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((button) =>
      button.addEventListener("click", () => {
        navigateDrawer(button.dataset.pocket as DrawerDestination, true);
      }),
    );
}

function htmlText(text: string) { return text.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!); }
function tradeQuantity(key: string) { return tradeQuantities[key] ?? 1; }
function quantityControl(key: string, title: string, maximum: number) {
  const value = tradeQuantity(key);
  return `<label class="trade-quantity"><span>数量</span><input type="number" inputmode="numeric" min="1" max="${maximum}" step="1" value="${Number.isFinite(value) ? value : ""}" data-quantity="${key}" data-focus-key="quantity-${key}" aria-label="${htmlText(title)}数量"></label>`;
}
function transactionButton(action: string, id: string, title: string, disabledReason = "") {
  const reasonId = `reason-${action}-${id}`;
  return `<button class="trade-button" data-economy-action="${action}" data-item="${id}" data-focus-key="${action}-${id}" ${disabledReason ? `disabled aria-describedby="${reasonId}"` : ""}>${htmlText(title)}</button>${disabledReason ? `<small id="${reasonId}" class="trade-reason">${htmlText(disabledReason)}</small>` : ""}`;
}
function renderEconomy(economy: EconomyView) {
  if (!economy) return;
  const active = document.activeElement instanceof HTMLElement ? document.activeElement.dataset.focusKey : undefined;
  byId("coinBalance").textContent = String(economy.coins);
  byId("partySummary").textContent = `跟随 ${economy.equipped.length}/${economy.equippedLimit} · 拥有 ${economy.pets.length}/${economy.ownedLimit}`;
  byId("memoryInventory").hidden = lifeTab !== "memories";
  const content = byId("economyContent"); content.hidden = lifeTab === "memories";
  document.querySelectorAll<HTMLButtonElement>("[data-life-tab]").forEach(button => {
    const selected = button.dataset.lifeTab === lifeTab;
    button.classList.toggle("active", selected); button.setAttribute("aria-pressed", String(selected));
  });
  if (lifeTab === "supplies") {
    const selected = ITEMS.find(item => item.id === selectedSupplyId) ?? ITEMS[0];
    const count = economy.items.find(item => item.id === selected.id)?.count ?? 0;
    const quantity = tradeQuantity(`sell-${selected.id}`);
    const valid = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= count;
    const sellReason = !count ? "暂无物资可售" : !valid ? `数量须为 1–${count} 的整数` : economy.coins + selected.sellPrice * quantity > MAX_COINS ? "金币将超出上限" : "";
    const useReason = !count ? "背包里还没有这份补给" : selected.id === "pet-treat" && !economy.equipped.length ? "请先安排伙伴出战" : "";
    content.innerHTML = `<div class="supply-grid" role="group" aria-label="选择物资查看详情">${ITEMS.map(item => {
      const held = economy.items.find(stack => stack.id === item.id)?.count ?? 0;
      return `<button class="supply-slot ${selected.id === item.id ? "selected" : ""} ${held ? "" : "empty"}" data-supply="${item.id}" data-focus-key="supply-${item.id}" aria-pressed="${selected.id === item.id}" aria-label="${htmlText(item.title)}，持有${held}份，查看详情"><span aria-hidden="true">${item.icon}</span><b>${htmlText(item.title)}</b><small>×${held}</small></button>`;
    }).join("")}</div><article class="supply-detail" aria-label="选中物资详情"><div class="supply-detail-title"><b>${htmlText(selected.title)}</b><small>持有 ${count} · 售价 ${selected.sellPrice}/份</small></div><p>${htmlText(selected.description)}</p><div class="trade-row">${quantityControl(`sell-${selected.id}`, selected.title, Math.max(1,count))}<div>${transactionButton("sell", selected.id, `售出 · ${valid ? quantity * selected.sellPrice : "—"} 金币`, sellReason)}</div>${selected.effect ? `<div>${transactionButton("use", selected.id, "使用 1 份", useReason)}</div>` : ""}</div></article>`;
  } else if (lifeTab === "exchange") {
    content.innerHTML = `<div class="shop-intro"><b>购买旅行补给</b><button data-drawer-target="inventory">去背包出售物资 →</button></div><div class="life-card-list compact-shop">${economy.shop.map(item => {
      const quantity = tradeQuantity(`buy-${item.id}`);
      const valid = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= economy.maxStack;
      const reason = !valid ? "请输入有效的正整数数量" : item.owned + quantity > economy.maxStack ? "超过堆叠上限，请减少数量" : item.price * quantity > economy.coins ? `还差 ${item.price * quantity - economy.coins} 金币` : "";
      return `<article class="life-card"><div class="life-card-head"><span class="life-badge" aria-hidden="true">${item.icon}</span><div><b>${htmlText(item.title)}</b><small>${item.price} 金币/份 · 背包已有 ${item.owned}</small></div></div><p>${htmlText(item.description)}</p><div class="trade-row">${quantityControl(`buy-${item.id}`, item.title, economy.maxStack)}<div>${transactionButton("buy", item.id, `购买 · ${valid ? item.price * quantity : "—"} 金币`, reason)}</div></div></article>`;
    }).join("")}</div>`;
  } else if (lifeTab === "pets") {
    content.innerHTML = `<h3 class="life-subtitle">我的伙伴 · ${economy.pets.length}/${economy.ownedLimit}</h3><div class="life-card-list compact-pets">${economy.pets.length ? economy.pets.map(pet => `<article class="life-card ${pet.equipped ? "pet-equipped" : ""}"><div class="life-card-head"><span class="pet-portrait pet-${pet.species}" role="img" aria-label="${htmlText(pet.name)}像素肖像"></span><div><b>${htmlText(pet.name)}</b><small>${pet.equipped ? "已出战 · 跟随中" : "伙伴册休息中"}</small></div></div><div class="trade-row">${transactionButton(pet.equipped ? "rest" : "equip", pet.id, pet.equipped ? "休息" : "出战", pet.canEquip ? "" : pet.disabledReason)}</div></article>`).join("") : `<p class="economy-help">出售物资换金币，结识第一位伙伴。</p>`}</div><h3 class="life-subtitle">结识新伙伴</h3><div class="life-card-list compact-pets">${economy.petShop.map(pet => `<article class="life-card"><div class="life-card-head"><span class="pet-portrait pet-${pet.id}" role="img" aria-label="${htmlText(pet.title)}像素肖像"></span><div><b>${htmlText(pet.title)}</b><small>已有 ${pet.owned} 只</small></div></div><div class="trade-row">${transactionButton("adopt", pet.id, `领养 · ${pet.price} 金币`, pet.disabledReason)}</div></article>`).join("")}</div>`;
  }
  if (active) {
    focusDrawerKeys(transactionFocusKeys(active,drawerDestination,selectedSupplyId));
  }
}
function visibleDrawerControl(element: HTMLElement) { return element.getClientRects().length > 0 && !element.closest("[hidden]") && !(element as HTMLButtonElement).disabled; }
function focusDrawerKeys(keys: string[]) {
  if (!drawer.classList.contains("open")) return;
  for (const key of keys) {
    const element = key.startsWith("tab:") ? Array.from(drawer.querySelectorAll<HTMLElement>("[data-tab]")).find(node=>node.dataset.tab===key.slice(4)) : Array.from(drawer.querySelectorAll<HTMLElement>("[data-focus-key]")).find(node=>node.dataset.focusKey===key);
    if(element && visibleDrawerControl(element)){element.focus({preventScroll:true});return;}
  }
  byId("drawerClose").focus({preventScroll:true});
}
function focusDrawerDestination() {
  const route=drawerRoute(drawerDestination);
  const panel=drawer.querySelector<HTMLElement>(`[data-panel="${route.panel}"]`);
  if(drawerDestination==="inventory"){focusDrawerKeys([`supply-${selectedSupplyId}`,`tab:${route.top}`]);return;}
  const first=Array.from(panel?.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex='0']")??[]).find(visibleDrawerControl);
  if(first)first.focus({preventScroll:true});else focusDrawerKeys([`tab:${route.top}`]);
}
function selectLifeTab(tab: typeof lifeTab) {
  lifeTab = tab;
  byId("economyFeedback").hidden = true;
  if (currentView) renderEconomy(currentView.economy);
}
function renderEconomyAchievements(economy: EconomyView) {
  // Kept as a render hook; achievements now have a direct, non-collapsed destination.
  if (economy && currentView) renderAchievementPage(currentView);
}

function navigateDrawer(destination: DrawerDestination, open = false) {
  const source=document.activeElement;
  const fromPanel=source instanceof HTMLElement && Boolean(source.closest(".drawer-panel"));
  if (open) openDrawer();
  if (open && !drawer.classList.contains("open")) return;
  drawerDestination = destination;
  const route = drawerRoute(destination);
  byId("drawerTitle").textContent = route.title;
  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(button => { const active = button.dataset.tab === route.top; button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); });
  document.querySelectorAll<HTMLElement>("[data-panel]").forEach(panel => panel.classList.toggle("active",panel.dataset.panel === route.panel));
  if (route.lifeTab) selectLifeTab(route.lifeTab);
  if (currentView) { renderAchievementPage(currentView); renderNearbySupplies(currentView); }
  if(open || fromPanel)focusDrawerDestination();
}
function renderAchievementPage(view: CampaignView) {
  const cards = achievementCards(view.economy.achievements,view.exploration.achievements,view.level.day);
  byId("achievementSummary").textContent = `已达成 ${cards.filter(a=>a.done).length} / ${cards.length} 项`;
  document.querySelectorAll<HTMLButtonElement>("[data-achievement-filter]").forEach(button=>{ const active=button.dataset.achievementFilter===achievementFilter; button.classList.toggle("active",active); button.setAttribute("aria-pressed",String(active)); });
  const shown=filterAchievements(cards,achievementFilter);
  byId("achievementCards").innerHTML=shown.length?shown.map(a=>`<article class="achievement-card ${a.done?"done":""}"><div><span aria-hidden="true">${a.done?"✦":"◇"}</span><b>${htmlText(a.title)}</b><small>${a.done?"已完成":"未完成"}</small></div><small>${htmlText(a.scope)}</small><p>${htmlText(a.condition)}</p><label><span>进度 ${a.current} / ${a.target}</span><progress max="${a.target}" value="${a.current}" aria-label="${htmlText(a.title)}进度"></progress></label></article>`).join(""):`<p class="economy-help">${achievementFilter==="done"?"还没有已完成的成就。收集一份物资或探索本日小事，进度会在这里更新。":"这个筛选下没有成就；可以切回全部查看。"}</p>`;
}
function refreshLifeGuide() {
  const blocked = drawer.classList.contains("open") || gameFrame.classList.contains("cinematic") || hasVisibleModal([campaignOverlay,puzzleOverlay,codeOverlay,deathOverlay,completeOverlay,byId("doorOverlay")]);
  byId("lifeOnboarding").hidden = !showLifeGuide(lifeGuideDismissed,blocked);
  positionLifeGuide();
}
function positionLifeGuide() {
  const guide=byId("lifeOnboarding");if(guide.hidden)return;
  const frame=gameFrame.getBoundingClientRect(), rect=guide.getBoundingClientRect();
  const blockers=[byId("minimap"),byId("quickbar")].filter(element=>element.getClientRects().length>0).map(element=>element.getBoundingClientRect());
  guide.style.bottom=`${lifeGuideBottom(frame,rect,blockers)}px`;
}
function renderNearbySupplies(view: CampaignView) {
  let panel=document.getElementById("nearbySupplyPanel");
  if(!panel){panel=document.createElement("section");panel.id="nearbySupplyPanel";panel.className="nearby-supply-panel";panel.setAttribute("aria-label","附近可收集");document.querySelector(".economy-wallet")!.after(panel);}
  panel.hidden=drawerDestination!=="inventory";
  const supply=view.supplies;
  const signature=JSON.stringify(supply);
  if(panel.dataset.signature===signature)return;
  panel.dataset.signature=signature;
  panel.innerHTML=`<div class="nearby-title"><b>附近可收集</b><button data-find-supply ${supply.canFind?"":"disabled"}>找一处</button></div><small>尚有物资 ${supply.ready} · 可带路 ${supply.recommendations.length} · 冷却 ${supply.coolingGather} · 已取空 ${supply.claimedContainers}${supply.earliestRenewSeconds!==null?` · 最近 ${supply.earliestRenewSeconds}s` : ""}</small>${supply.recommendations.length?`<div class="nearby-recommendations">${supply.recommendations.map(node=>`<button data-focus-supply="${node.id}"><span><b>${htmlText(node.title)}</b><small>${htmlText(node.expectedLoot)} · ${node.status} · ${htmlText(node.distanceLabel)}</small></span><i>前往 →</i></button>`).join("")}</div>`:`<p>${htmlText(supply.reason)}</p>`}`;
}

document.querySelectorAll<HTMLButtonElement>("[data-achievement-filter]").forEach(button=>button.addEventListener("click",()=>{achievementFilter=button.dataset.achievementFilter as AchievementFilter;if(currentView)renderAchievementPage(currentView);}));
byId("dismissLifeGuide").addEventListener("click",()=>{lifeGuideDismissed=true;try{localStorage.setItem("one-more-day:life-guide-016","dismissed");}catch{}refreshLifeGuide();canvas.focus();});
byId("restoreLifeGuide").addEventListener("click",()=>{lifeGuideDismissed=false;try{localStorage.removeItem("one-more-day:life-guide-016");}catch{}closeDrawer();refreshLifeGuide();});
document.querySelectorAll<HTMLButtonElement>("[data-guide-action]").forEach(button=>button.addEventListener("click",()=>{if(button.dataset.guideAction==="collect"){closeDrawer();game.findNearbySupply();}else navigateDrawer(button.dataset.guideAction as DrawerDestination,true);}));
const lifeGuideResize = new ResizeObserver(positionLifeGuide);
[gameFrame,byId("minimap"),byId("lifeOnboarding")].forEach(element=>lifeGuideResize.observe(element));
drawer.addEventListener("click",event=>{ const target=event.target instanceof Element?event.target.closest<HTMLButtonElement>("[data-focus-supply],[data-find-supply],[data-drawer-target]"):null;if(!target||target.disabled)return;if(target.dataset.drawerTarget){navigateDrawer(target.dataset.drawerTarget as DrawerDestination);return;}closeDrawer();if(target.dataset.focusSupply)game.focusLife(target.dataset.focusSupply);else game.findNearbySupply();});

document.querySelectorAll<HTMLButtonElement>("[data-life-tab]").forEach(button => button.addEventListener("click", () => {
  selectLifeTab(button.dataset.lifeTab as typeof lifeTab); audio.play({ id: "ui.click.soft" });
}));
byId("economyContent").addEventListener("input", event => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.dataset.quantity) return;
  tradeQuantities[input.dataset.quantity] = input.value.trim() ? Number(input.value) : NaN;
  if (currentView) renderEconomy(currentView.economy);
});
byId("economyContent").addEventListener("keydown", event => {
  if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
});
byId("economyContent").addEventListener("click", event => {
  const supply = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-supply]") : null;
  if (supply && drawer.classList.contains("open") && ITEMS.some(item => item.id === supply.dataset.supply)) {
    selectedSupplyId = supply.dataset.supply!;
    if (currentView) renderEconomy(currentView.economy);
    return;
  }
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-economy-action]") : null;
  if (!button || button.disabled || !drawer.classList.contains("open")) return;
  const id = button.dataset.item!, action = button.dataset.economyAction;
  let result: EconomyResult;
  if (action === "sell") result = game.sellItem(id, tradeQuantity(`sell-${id}`));
  else if (action === "buy") result = game.buyItem(id, tradeQuantity(`buy-${id}`));
  else if (action === "use") result = game.useItem(id);
  else if (action === "adopt") result = game.buyPet(id);
  else if (action === "equip" || action === "rest") result = game.equipPet(id, action === "equip");
  else return;
  byId("economyFeedback").textContent = result.message;
  byId("economyFeedback").hidden = false;
  byId("economyFeedback").classList.toggle("wrong", !result.ok);
});

function renderJournal(view: CampaignView) {
  let exploration = document.getElementById("explorationJournal");
  if (!exploration) { exploration = document.createElement("div"); exploration.id = "explorationJournal"; byId("sideList").parentElement!.after(exploration); }
  exploration.innerHTML = `<details class="journal-block" open><summary>自由探索 · ${view.exploration.flags.length}/${view.exploration.discoveries.length}</summary><p class="exploration-help">无需完成主线即可发现。工具与收藏永久记入本日相册，重走这一天也不会丢失。</p>${view.exploration.discoveries.map(d => `<div class="side-row ${d.done ? "done" : ""}"><i>${d.done ? "✓" : "·"}</i><span><b>${d.title} <small>${d.location}</small></b><small>${d.description}</small></span></div>`).join("")}</details><details class="journal-block" open><summary>地方成就</summary>${view.exploration.achievements.map(a => `<div class="side-row ${a.done ? "done" : ""}"><i>${a.done ? "✦" : "◇"}</i><span><b>${a.title}</b><small>${a.description} · ${a.done ? "已达成" : "尚未达成"}</small></span></div>`).join("")}</details><details class="journal-block"><summary>八日收藏册</summary>${view.exploration.album.map(a => `<div class="side-row"><i>${a.visited ? "▧" : "·"}</i><span><b>DAY ${a.day} · ${a.title}</b><small>收藏 ${a.found}/${a.total} · ${a.visited ? "子场景已打卡" : "还有一处室内等你探索"}</small></span></div>`).join("")}</details>`;
  byId("journalTitle").textContent =
    `DAY ${String(view.level.day).padStart(2, "0")} · ${view.level.name}`;
  byId("journalBar").style.width =
    `${(view.solved.length / view.level.puzzles.length) * 100}%`;
  byId("clueList").innerHTML = view.level.puzzles
    .map((puzzle, index) => {
      const solved = view.solved.includes(puzzle.id);
      const current = view.currentPuzzle?.id === puzzle.id;
      return `<div class="clue-row ${solved ? "solved" : current ? "current" : "locked"}"><i>${solved ? puzzle.symbol : index + 1}</i><div><b>${puzzle.title}</b><small>${solved ? `${puzzle.symbol}＝${puzzle.rewardDigit} · ${puzzle.rewardItem}` : current ? puzzle.prompt : "先完成上一条推理"}</small></div><span>${solved ? "✓" : current ? "→" : "·"}</span></div>`;
    })
    .join("");
  byId("sideList").innerHTML =
    view.level.sideTasks
      .map(
        (side) =>
          `<div class="side-row ${view.sideTasks.includes(side.id) ? "done" : ""}"><i>${side.icon}</i><span><b>${side.title}</b><small>${view.sideTasks.includes(side.id) ? side.completeText : side.prompt}</small></span></div>`,
      )
      .join("") +
    view.worldItems
      .map(
        (item) =>
          `<div class="side-row done"><i>◇</i><span><b>${item}</b><small>${item.includes("手记") ? "探索发现：今天没有挖到金子，但陪孩子看了夕阳。" : "探索工具已找到，裂墙可使用。"}</small></span></div>`,
      )
      .join("");
  const save = game.getSave();
  byId("stampList").innerHTML = LEVELS.map(
    (level) =>
      `<span class="${save.completed.includes(level.id) ? "earned" : ""}" title="${level.name}">${save.completed.includes(level.id) ? level.stamp : "？"}</span>`,
  ).join("");
}

function renderFieldHint() {
  if (!currentView) return;
  const puzzle = currentView.currentPuzzle;
  const button = byId<HTMLButtonElement>("fieldHintButton");
  const hintText = byId("fieldHint");
  if (currentView.exploration.roomId) {
    button.hidden = true; hintText.hidden = true; return;
  }
  button.hidden = false;
  if (currentView.accessHint) {
    button.hidden = true;
    hintText.hidden = false;
    hintText.textContent = currentView.accessHint;
    return;
  }
  if (!puzzle) {
    button.hidden = true;
    hintText.hidden = false;
    hintText.textContent = `终点顺序：${currentView.level.finalSymbolOrder.join(" → ")}。数字对应关系在随身日志里。`;
    return;
  }
  button.hidden = false;
  const stage = game.hintStage(puzzle.id);
  button.querySelector("span")!.textContent = `${Math.min(stage + 1, 3)}/3`;
  hintText.hidden = stage === 0;
  hintText.textContent = stage > 0 ? puzzle.hints[stage - 1] : "";
}

function openPuzzle(puzzle: PuzzleSpec) {
  activePuzzle = puzzle;
  sequenceInput = [];
  patternInput = Array.from(
    { length: puzzle.slots ?? puzzle.solution.length },
    () => puzzle.options[0] ?? "",
  );
  puzzleHintStage = game.hintStage(puzzle.id);
  puzzleCompleting = false;
  puzzleOptions = shuffledOptions(puzzle);
  byId("puzzleIcon").textContent = puzzle.icon;
  byId("puzzleType").textContent = puzzle.kind.toUpperCase();
  byId("puzzleTitle").textContent = puzzle.title;
  byId("puzzleStory").textContent = puzzle.story;
  byId("evidenceList").innerHTML = puzzle.evidence
    .map((line, index) => `<p><span>${index + 1}</span>${line}</p>`)
    .join("");
  byId("puzzleInstruction").textContent =
    puzzle.kind === "sequence"
      ? "先排列全部动作，确认后统一判断；可以重新排序。"
      : puzzle.instruction;
  byId("puzzleFeedback").textContent = "";
  byId("puzzleHintText").textContent =
    "提示会逐层从“注意什么”推进到“具体怎么做”。";
  byId("puzzleHintButton").innerHTML = "拆开一层提示 <span>0 / 3</span>";
  if (puzzleHintStage) {
    byId("puzzleHintText").textContent = puzzle.hints[puzzleHintStage - 1];
    byId("puzzleHintButton").innerHTML =
      `拆开一层提示 <span>${puzzleHintStage} / 3</span>`;
  }
  renderPuzzleControls();
  showOverlay(puzzleOverlay);
  audio.play({ id: "ui.drawer.open" });
}

function renderPuzzleControls() {
  if (!activePuzzle) return;
  const controls = byId("puzzleControls");
  const puzzle = activePuzzle;
  if (puzzle.kind === "sequence")
    controls.innerHTML = `<div class="sequence-track">${puzzle.solution.map((_, index) => `<span>${sequenceInput[index] ?? index + 1}</span>`).join("")}</div><div class="option-grid">${puzzleOptions.map((option) => `<button data-option="${option}" ${sequenceInput.includes(option) ? "disabled" : ""}>${option}</button>`).join("")}</div><button class="small-reset" data-reset>重新排序</button><button class="check-action" data-check ${sequenceInput.length !== puzzle.solution.length ? "disabled" : ""}>确认这次推理</button>`;
  else if (puzzle.kind === "choice")
    controls.innerHTML = `<div class="choice-grid">${puzzleOptions.map((option, index) => `<button data-option="${option}"><i aria-hidden="true">${index + 1}</i>${option}</button>`).join("")}</div>`;
  else if (puzzle.kind === "pattern")
    controls.innerHTML = `<div class="pattern-grid">${patternInput.map((value, index) => `<button data-slot="${index}"><small>${index + 1}</small><b>${value}</b><span>点击切换</span></button>`).join("")}</div><button class="check-action" data-check>检查规律</button>`;
  else {
    controls.innerHTML = `<div class="number-solve"><input id="puzzleNumber" inputmode="numeric" maxlength="3" placeholder="?" aria-label="谜题答案"><button data-check>确认答案</button></div>`;
    byId<HTMLInputElement>("puzzleNumber").focus();
  }
  controls
    .querySelectorAll<HTMLButtonElement>("[data-option]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        handleOption(button.dataset.option ?? ""),
      ),
    );
  controls
    .querySelectorAll<HTMLButtonElement>("[data-slot]")
    .forEach((button) =>
      button.addEventListener("click", () => {
        if (!activePuzzle) return;
        const index = Number(button.dataset.slot);
        const current = activePuzzle.options.indexOf(patternInput[index]);
        patternInput[index] =
          activePuzzle.options[(current + 1) % activePuzzle.options.length];
        audio.play({ id: "puzzle.partial" });
        renderPuzzleControls();
      }),
    );
  controls
    .querySelector<HTMLButtonElement>("[data-reset]")
    ?.addEventListener("click", () => {
      sequenceInput = [];
      renderPuzzleControls();
    });
  controls
    .querySelector<HTMLButtonElement>("[data-check]")
    ?.addEventListener("click", checkPuzzle);
  controls
    .querySelector<HTMLInputElement>("#puzzleNumber")
    ?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") checkPuzzle();
    });
}

function handleOption(option: string) {
  if (!activePuzzle || puzzleCompleting) return;
  if (activePuzzle.kind === "choice") {
    if (option === activePuzzle.solution[0]) finishPuzzle();
    else puzzleWrong();
    return;
  }
  if (
    sequenceInput.includes(option) ||
    sequenceInput.length === activePuzzle.solution.length
  )
    return;
  sequenceInput.push(option);
  audio.play({ id: "ui.click.soft" });
  renderPuzzleControls();
}

function checkPuzzle() {
  if (!activePuzzle || puzzleCompleting) return;
  const correct =
    activePuzzle.kind === "sequence"
      ? sequenceInput.length === activePuzzle.solution.length &&
        sequenceInput.every((v, i) => v === activePuzzle?.solution[i])
      : activePuzzle.kind === "pattern"
        ? patternInput.every(
            (value, index) => value === activePuzzle?.solution[index],
          )
        : byId<HTMLInputElement>("puzzleNumber").value.trim() ===
          activePuzzle.solution[0];
  if (correct) finishPuzzle();
  else puzzleWrong();
}
function puzzleWrong() {
  if (!activePuzzle) return;
  byId("puzzleFeedback").textContent = activePuzzle.wrongFeedback;
  byId("puzzleFeedback").className = "puzzle-feedback wrong";
  audio.play({ id: "puzzle.reset", caption: "这次推理没有对上" });
}
function finishPuzzle() {
  if (!activePuzzle || puzzleCompleting) return;
  puzzleCompleting = true;
  const solved = activePuzzle;
  byId("puzzleControls")
    .querySelectorAll("button,input")
    .forEach((e) => ((e as HTMLButtonElement).disabled = true));
  byId("puzzleFeedback").textContent = solved.solvedText;
  byId("puzzleFeedback").className = "puzzle-feedback correct";
  window.setTimeout(() => {
    hideOverlay(puzzleOverlay);
    game.solvePuzzle(solved.id);
    game.setPaused(false);
    activePuzzle = null;
    puzzleCompleting = false;
  }, 650);
}

function openCode(level: LevelDefinition) {
  byId("codeOrder").innerHTML = level.finalSymbolOrder
    .map(
      (symbol, index) =>
        `<span><small>${index + 1}</small><b>${symbol}</b><i>对应记忆</i></span>`,
    )
    .join("");
  document.getElementById("codeMemories")?.remove();
  const memories = document.createElement("details");
  memories.id = "codeMemories";
  memories.className = "code-memories";
  memories.innerHTML = `<summary>翻看今天收集的记忆卡</summary><div>${level.puzzles.map((q) => `<span><b>${q.symbol}＝${q.rewardDigit}</b><small>${q.rewardItem}</small></span>`).join("")}</div>`;
  byId("codeOrder").after(memories);
  byId<HTMLInputElement>("codeInput").value = "";
  byId("codeFeedback").textContent = "";
  showOverlay(codeOverlay);
}
function openComplete(level: LevelDefinition, view: CampaignView) {
  hideOverlay(codeOverlay);
  byId("completeStamp").textContent = level.stamp;
  byId("completeTitle").textContent = `${level.name} · 今天走完了`;
  byId("completeEnding").textContent = level.ending;
  byId("completeStats").innerHTML =
    `<span><b>${view.solved.length}/4</b>主线</span><span><b>${view.sideTasks.length}/2</b>小事</span><span><b>${view.deaths}</b>次重来</span><span><b>${view.hintsUsed}</b>层提示</span>`;
  const next = byId<HTMLButtonElement>("nextLevelButton");
  next.hidden = level.day === LEVELS.length;
  next.textContent =
    level.day === LEVELS.length
      ? ""
      : `进入 DAY ${String(level.day + 1).padStart(2, "0")} →`;
  showOverlay(completeOverlay);
}

const blockingOverlays = () => [campaignOverlay, puzzleOverlay, codeOverlay, deathOverlay, completeOverlay, byId("doorOverlay")];
function openDrawer() {
  if (!canOpenDrawer(blockingOverlays(), game.isInDeathSequence())) return;
  drawer.classList.add("open");
  drawer.inert = false;
  drawer.setAttribute("aria-hidden", "false");
  byId("menuButton").setAttribute("aria-expanded", "true");
  game.setPaused(true);
  audio.play({ id: "ui.drawer.open" });
  byId("drawerClose").focus();
  refreshLifeGuide();
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawer.inert = true;
  drawer.setAttribute("aria-hidden", "true");
  byId("menuButton").setAttribute("aria-expanded", "false");
  if (!hasVisibleModal(blockingOverlays())) game.setPaused(false);
  audio.play({ id: "ui.drawer.close" });
  canvas.focus();
  refreshLifeGuide();
}

byId("menuButton").addEventListener("click", () =>
  drawer.classList.contains("open") ? closeDrawer() : openDrawer(),
);
byId("drawerClose").addEventListener("click", closeDrawer);
byId("objectiveButton").addEventListener("click", () => {
  const guide = byId("guideCard");
  const hidden = guide.classList.toggle("collapsed");
  byId("objectiveButton").setAttribute("aria-expanded", String(!hidden));
});
byId("fieldHintButton").addEventListener("click", () => {
  const puzzle = currentView?.currentPuzzle;
  if (!puzzle) return;
  game.registerHint(puzzle.id, Math.min(3, game.hintStage(puzzle.id) + 1));
  renderFieldHint();
  audio.play({ id: "puzzle.partial" });
});
byId("puzzleHintButton").addEventListener("click", () => {
  if (!activePuzzle) return;
  puzzleHintStage = Math.min(3, puzzleHintStage + 1);
  game.registerHint(activePuzzle.id, puzzleHintStage);
  byId("puzzleHintText").textContent = activePuzzle.hints[puzzleHintStage - 1];
  byId("puzzleHintButton").innerHTML =
    `拆开一层提示 <span>${puzzleHintStage} / 3</span>`;
  audio.play({ id: "puzzle.partial" });
});
byId("puzzleClose").addEventListener("click", () => {
  if (puzzleCompleting) return;
  hideOverlay(puzzleOverlay);
  activePuzzle = null;
  game.setPaused(false);
});
byId("locateButton").addEventListener("click", () => {
  byId("minimap").classList.remove("collapsed");
  byId("minimapToggle").setAttribute("aria-expanded", "true");
  byId("minimapToggle").setAttribute("aria-label", "折叠探索地图");
  byId("minimapToggle").lastElementChild!.textContent = "−";
  game.locateCurrent();
});
byId("roomButton").addEventListener("click", () => {
  byId("guideCard").classList.add("collapsed");
  byId("objectiveButton").setAttribute("aria-expanded", "false");
  game.visitRoom();
});
byId("minimapToggle").addEventListener("click", () => {
  const collapsed = byId("minimap").classList.toggle("collapsed");
  byId("minimapToggle").setAttribute("aria-expanded", String(!collapsed));
  byId("minimapToggle").setAttribute(
    "aria-label",
    collapsed ? "展开探索地图" : "折叠探索地图",
  );
  byId("minimapToggle").lastElementChild!.textContent = collapsed ? "+" : "−";
});
byId("codeClose").addEventListener("click", () => {
  hideOverlay(codeOverlay);
  game.setPaused(false);
});
byId("restartButton").addEventListener("click", () => {
  hideOverlay(deathOverlay);
  game.restartAfterDeath();
});
byId("nextLevelButton").addEventListener("click", () => {
  const nextIndex = Math.min(
    LEVELS.length - 1,
    (currentView?.levelIndex ?? 0) + 1,
  );
  hideOverlay(completeOverlay);
  selectedLevel = nextIndex;
  game.startLevel(nextIndex);
  renderCampaign();
});
byId("backCampaignButton").addEventListener("click", () => {
  hideOverlay(completeOverlay);
  renderCampaign();
  showOverlay(campaignOverlay);
  game.setPaused(true);
});
byId("campaignButton").addEventListener("click", () => {
  closeDrawer();
  renderCampaign();
  showOverlay(campaignOverlay);
  game.setPaused(true);
});
byId("saveButton").addEventListener("click", () => {
  const saved = game.saveNow();
  byId("saveStatus").textContent =
    `已保存 · ${saved.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  showToast("生活日志已保存。", "success");
});
let resetArmed = false;
byId("resetSaveButton").addEventListener("click", () => {
  const button = byId<HTMLButtonElement>("resetSaveButton");
  if (!resetArmed) {
    resetArmed = true;
    button.textContent = "再次点击，确认清空";
    window.setTimeout(() => {
      resetArmed = false;
      button.textContent = "重置全部战役进度";
    }, 4000);
    return;
  }
  game.resetCampaignSave();
  resetArmed = false;
  button.textContent = "重置全部战役进度";
  selectedLevel = 0;
  closeDrawer();
  renderCampaign();
  showOverlay(campaignOverlay);
  game.setPaused(true);
  showToast("战役进度已重置。", "success");
});

document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) =>
  button.addEventListener("click", () => {
    navigateDrawer(button.dataset.tab as DrawerDestination);
    audio.play({ id: "ui.click.soft" });
  }),
);
document.querySelectorAll<HTMLButtonElement>("[data-digit]").forEach((button) =>
  button.addEventListener("click", () => {
    const input = byId<HTMLInputElement>("codeInput");
    if (input.value.length < 4) input.value += button.dataset.digit;
    audio.play({ id: "ui.click.soft" });
  }),
);
document
  .querySelector<HTMLButtonElement>("[data-key='back']")
  ?.addEventListener("click", () => {
    const input = byId<HTMLInputElement>("codeInput");
    input.value = input.value.slice(0, -1);
  });
document
  .querySelector<HTMLButtonElement>("[data-key='enter']")
  ?.addEventListener("click", () => {
    const input = byId<HTMLInputElement>("codeInput");
    if (input.value.length < 4) {
      byId("codeFeedback").textContent = "口令需要四位。先按符号顺序查日志。";
      return;
    }
    if (!game.submitFinal(input.value)) {
      byId("codeFeedback").textContent =
        "四个数字都见过，但排列顺序不对。先读门框符号，再查日志对应关系。";
      input.select();
    }
  });

byId("fullscreenButton").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await gameFrame.requestFullscreen();
  } catch {
    showToast("浏览器阻止了全屏，请在浏览器菜单中允许。", "danger");
  }
});
document.addEventListener("fullscreenchange", () => {
  const full = document.fullscreenElement === gameFrame;
  byId("fullscreenButton").textContent = full ? "⤢" : "⛶";
  byId("fullscreenButton").setAttribute(
    "aria-label",
    full ? "退出全屏" : "进入全屏",
  );
  showToast(full ? "已进入全屏，按 Esc 可退出。" : "已退出全屏。", "success");
});
const dangerAssist = byId<HTMLInputElement>("dangerAssist");
const reducedMotion = byId<HTMLInputElement>("reducedMotion");
try {
  const settings = JSON.parse(
    localStorage.getItem("one-more-day:visual-settings") ?? "{}",
  );
  dangerAssist.checked = Boolean(settings.danger);
  reducedMotion.checked =
    settings.reduced ??
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
} catch {
  /* Defaults remain usable when local storage is unavailable. */
}
game.setDangerAssist(dangerAssist.checked);
game.setReducedMotion(reducedMotion.checked);
const saveVisualSettings = () => {
  game.setDangerAssist(dangerAssist.checked);
  game.setReducedMotion(reducedMotion.checked);
  try {
    localStorage.setItem(
      "one-more-day:visual-settings",
      JSON.stringify({
        danger: dangerAssist.checked,
        reduced: reducedMotion.checked,
      }),
    );
  } catch {
    /* Session settings still work. */
  }
};
dangerAssist.addEventListener("change", saveVisualSettings);
reducedMotion.addEventListener("change", saveVisualSettings);
const audioSettings = audio.getSettings();
byId<HTMLInputElement>("soundCaptions").checked = audioSettings.captions;
byId<HTMLInputElement>("monoAudio").checked = audioSettings.mono;
byId<HTMLInputElement>("soundCaptions").addEventListener("change", (event) =>
  audio.setCaptions((event.target as HTMLInputElement).checked),
);
byId<HTMLInputElement>("monoAudio").addEventListener("change", (event) =>
  audio.setMono((event.target as HTMLInputElement).checked),
);
document
  .querySelectorAll<HTMLInputElement>("[data-volume]")
  .forEach((slider) => {
    const bus = slider.dataset.volume as "master" | AudioBus;
    slider.value = String(Math.round(audioSettings[bus] * 100));
    const output = slider.parentElement?.querySelector("output");
    if (output) output.textContent = `${slider.value}%`;
    slider.addEventListener("input", () => {
      const value = Number(slider.value) / 100;
      audio.setVolume(bus, value);
      if (output) output.textContent = `${slider.value}%`;
    });
  });
document.addEventListener(
  "pointerdown",
  () => {
    void audio.unlock();
  },
  { once: true },
);
byId("codeInput").addEventListener("keydown", (event) => {
  if (event.key === "Enter")
    document.querySelector<HTMLButtonElement>("[data-key='enter']")?.click();
});
document.addEventListener("keydown", (event) => {
  if (trapModalTab(event, byId("doorOverlay"), document.activeElement)) return;
  if (event.key === "Tab" && drawer.classList.contains("open")) {
    const controls = Array.from(drawer.querySelectorAll<HTMLElement>("button:not([disabled]),input:not([disabled]),select:not([disabled]),summary,[tabindex='0']")).filter(visibleDrawerControl);
    event.preventDefault();
    const next=nextDrawerFocusIndex(controls.findIndex(element=>element===document.activeElement),controls.length,event.shiftKey);
    if(next>=0)controls[next].focus();
    return;
  }
  if (event.key !== "Escape") return;
  if (!byId("doorOverlay").hidden) { byId("doorCancel").click(); return; }
  if (!puzzleOverlay.hidden && !puzzleCompleting) byId("puzzleClose").click();
  else if (!codeOverlay.hidden) byId("codeClose").click();
  else if (drawer.classList.contains("open")) closeDrawer();
});
renderCampaign();

document.addEventListener("visibilitychange", () =>
  audio.setSuspended(document.hidden),
);

// Explicit development-only review controls. Normal players never see or need these.
if (import.meta.env.DEV && new URLSearchParams(location.search).has("debug")) {
  const review = document.createElement("nav");
  review.className = "qa-toolbar";
  review.setAttribute("aria-label", "开发评审关卡选择");
  review.innerHTML = LEVELS.map(
    (level, index) =>
      `<button data-review-level="${index}">试玩 DAY ${level.day}</button>`,
  ).join("");
  app.append(review);
  const prepareReview = () => {
    [campaignOverlay, puzzleOverlay, codeOverlay, deathOverlay, completeOverlay, byId("doorOverlay")].forEach(element => {
      element.classList.remove("active"); element.hidden = true;
    });
    drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); drawer.inert = true;
    activePuzzle = null; puzzleCompleting = false;
    byId("guideCard").classList.add("collapsed"); byId("objectiveButton").setAttribute("aria-expanded", "false");
  };
  review.querySelectorAll<HTMLButtonElement>("button").forEach((button) =>
    button.addEventListener("click", () => {
      prepareReview();
      selectedLevel = Number(button.dataset.reviewLevel);
      game.startLevel(selectedLevel, true);
    }),
  );
  for (const level of LEVELS) {
    const button = document.createElement("button");
    button.textContent = `验收室内 DAY ${level.day}`;
    button.addEventListener("click", () => {
      prepareReview(); selectedLevel = level.day - 1; game.previewRoom(selectedLevel);
    });
    review.append(button);
  }
  const accident = document.createElement("button");
  accident.textContent = "评审招牌事故";
  accident.addEventListener("click", () => {
    prepareReview();
    game.previewSignAccident();
  });
  review.append(accident);
}
