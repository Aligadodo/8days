import "./style.css";
import { AudioManager, type AudioBus } from "./audio/AudioManager";
import { CampaignGame } from "./campaign/CampaignGame";
import { shuffledOptions } from "./campaign/puzzleLogic";
import { CAMPAIGN_PHRASE, LEVELS } from "./campaign/levels";
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
      <div class="release-chip"><i></i> EXPLORATION PASS 0.10.0</div>
    </header>
    <section id="gameFrame" class="game-frame" aria-label="八日旅程游戏区域">
      <canvas id="gameCanvas" tabindex="0" aria-label="Q版像素风探索地图"></canvas>
      <div class="hud-top">
        <div class="day-card pixel-panel"><span id="weatherIcon">☂</span><div><b id="dayValue">DAY 01</b><small id="timeValue">07:18</small></div></div>
        <div class="mission-stack">
          <button id="objectiveButton" class="objective-card pixel-panel" aria-expanded="false"><span class="objective-star">✦</span><span><small id="progressValue">主线 0 / 4</small><b id="objectiveValue">找到第一处线索</b></span><i>⌄</i></button>
          <div id="guideCard" class="guide-card pixel-panel collapsed"><div><span class="guide-label">现在做什么</span><p id="guideReason">鼠标停在物件上时显示细光边；点击后自动靠近调查。</p></div><button id="locateButton">在小地图定位</button><button id="fieldHintButton">给我一点提示 <span>1/3</span></button><p id="fieldHint" class="field-hint" hidden></p></div>
        </div>
        <div class="hud-actions"><button id="fullscreenButton" class="icon-button pixel-panel" aria-label="进入全屏" title="全屏">⛶</button><button id="menuButton" class="icon-button pixel-panel" aria-label="打开背包" aria-expanded="false" title="背包">▣</button></div>
      </div>
      <div id="routeHelp" class="route-help">点击地面移动 · 悬停物件描边 · 右键停下</div>
      <aside id="minimap" class="minimap" aria-label="探索地图"><button id="minimapToggle" aria-expanded="true" aria-label="折叠探索地图"><span id="regionName">街口</span><span>−</span></button><canvas id="minimapCanvas" width="280" height="158" aria-label="探索过的区域、当前位置与方向。点击已探索地面可以前往。"></canvas><small>▲ 你在这里 · 深色为未探索</small></aside>
      <div id="quickbar" class="quickbar" aria-label="本关获得的物品"></div>
      <div id="toast" class="toast" role="status" aria-live="polite"></div>
      <div id="soundCaption" class="sound-caption" role="status" aria-live="polite" hidden></div>
      <aside id="drawer" class="drawer" aria-hidden="true">
        <div class="drawer-head"><div><small>POCKET MENU</small><b>随身日志</b></div><button id="drawerClose" aria-label="关闭">×</button></div>
        <nav class="drawer-tabs"><button class="active" data-tab="inventory">▣<span>道具</span></button><button data-tab="journal">▤<span>日志</span></button><button data-tab="save">▥<span>存档</span></button><button data-tab="settings">⚙<span>设置</span></button></nav>
        <section class="drawer-panel active" data-panel="inventory"><div class="section-title"><small>FOUND TODAY</small><b>今天带在身上的东西</b></div><div id="inventoryGrid" class="inventory-grid"></div></section>
        <section class="drawer-panel" data-panel="journal"><div class="section-title"><small>LIFE LOG</small><b id="journalTitle">DAY 01 · 暴雨通勤</b></div><div class="journal-progress"><span id="journalBar"></span></div><div class="journal-block"><b>主线推理</b><div id="clueList" class="clue-list"></div></div><div class="journal-block"><b>顺手做的小事</b><div id="sideList" class="side-list"></div></div><div class="journal-block"><b>八日印章</b><div id="stampList" class="stamp-list"></div></div></section>
        <section class="drawer-panel" data-panel="save"><div class="save-card"><span>☁</span><h3>设备本地存档</h3><p>谜题线索、死亡后的经验、支线与已解锁关卡都会自动保存。</p><button id="saveButton" class="menu-action">立即保存生活日志</button><small id="saveStatus">自动保存已开启</small></div><button id="campaignButton" class="secondary-action">返回八日旅程</button><button id="resetSaveButton" class="secondary-action reset-action">重置全部战役进度</button></section>
        <section class="drawer-panel" data-panel="settings"><label class="setting-row"><div><b>加强危险轮廓</b><small>始终显示危险区域边界</small></div><input id="dangerAssist" type="checkbox"></label><label class="setting-row"><div><b>减少动态效果</b><small>关闭晃动、漂浮和呼吸动画</small></div><input id="reducedMotion" type="checkbox"></label><label class="setting-row"><div><b>声音字幕</b><small>把重要方向声转成画面提示</small></div><input id="soundCaptions" type="checkbox"></label><label class="setting-row"><div><b>单声道</b><small>取消左右声像</small></div><input id="monoAudio" type="checkbox"></label><div class="volume-list"><label><span>主音量</span><input data-volume="master" type="range" min="0" max="100" step="5"><output></output></label><label><span>音乐</span><input data-volume="music" type="range" min="0" max="100" step="5"><output></output></label><label><span>音效</span><input data-volume="effects" type="range" min="0" max="100" step="5"><output></output></label><label><span>环境</span><input data-volume="ambience" type="range" min="0" max="100" step="5"><output></output></label></div><div class="legend"><b>光边含义</b><span><i class="main"></i>主线</span><span><i class="side"></i>小事</span><span><i class="done"></i>完成</span></div></section>
      </aside>
      <div id="campaignOverlay" class="overlay active"><div class="campaign-card"><div class="campaign-copy"><p class="eyebrow">EIGHT ORDINARY DAYS</p><h1>八日旅程</h1><p>死亡不是猜拳。观察环境的提前迹象，记住失败带来的知识，再把今天认真走完。</p><div class="phrase-preview"><small>最终日记</small><b id="phrasePreview">＿＿＿＿，＿＿＿＿</b></div></div><div id="levelGrid" class="level-grid"></div><div id="levelBrief" class="level-brief"></div></div></div>
      <div id="puzzleOverlay" class="overlay" hidden><div class="puzzle-card"><button id="puzzleClose" class="modal-close" aria-label="暂时离开谜题">×</button><div class="puzzle-heading"><span id="puzzleIcon">◉</span><div><p class="eyebrow" id="puzzleType">SEQUENCE</p><h2 id="puzzleTitle">谜题</h2></div></div><p id="puzzleStory" class="puzzle-story"></p><div class="evidence-board"><b>现场观察</b><div id="evidenceList"></div></div><div class="solve-board"><b id="puzzleInstruction"></b><div id="puzzleControls"></div><p id="puzzleFeedback" class="puzzle-feedback" aria-live="polite"></p></div><div class="hint-ladder"><button id="puzzleHintButton">拆开一层提示 <span>0 / 3</span></button><p id="puzzleHintText">提示会逐层从“注意什么”推进到“具体怎么做”。</p></div></div></div>
      <div id="codeOverlay" class="overlay" hidden><div class="code-card"><button id="codeClose" class="modal-close" aria-label="离开口令门">×</button><p class="eyebrow">FINAL DEDUCTION</p><h2>把今天放回正确顺序</h2><p>数字不是直接抄来的。先按终点门框上的符号顺序，再查日志中每个符号对应的数字。</p><div id="codeOrder" class="code-order"></div><input id="codeInput" maxlength="4" inputmode="numeric" aria-label="四位通关口令" autocomplete="off"><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => `<button data-digit="${digit}">${digit}</button>`).join("")}<button data-key="back">←</button><button data-digit="0">0</button><button data-key="enter">✓</button></div><p id="codeFeedback" class="puzzle-feedback" aria-live="polite"></p></div></div>
      <div id="deathOverlay" class="overlay" hidden><div class="death-card"><p class="eyebrow danger">THIS DAY ENDED AT <span id="deathTime"></span></p><div class="fallen-flower">✿</div><h2 id="deathCause">这一天停下了</h2><p id="deathLesson"></p><div class="memory-kept">已解开的主线线索会保留。你失去的是这次路程，不是学到的经验。</div><button id="restartButton" class="primary-action">带着记忆重来 <span>↻</span></button></div></div>
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
  const [baseHour, baseMinute] = view.level.startTime.split(":").map(Number);
  const gameMinutes = Math.floor(view.elapsedSeconds / 8);
  byId("timeValue").textContent =
    `${String((baseHour + Math.floor((baseMinute + gameMinutes) / 60)) % 24).padStart(2, "0")}:${String((baseMinute + gameMinutes) % 60).padStart(2, "0")}`;
  byId("progressValue").textContent =
    `主线 ${view.solved.length} / ${view.level.puzzles.length}`;
  byId("objectiveValue").textContent = view.objective;
  const current = view.currentPuzzle;
  byId("guideReason").textContent = current
    ? `寻找“${current.title}”。鼠标悬停时物件会描边，点击后自动靠近。需要找路时可以在小地图定位。`
    : "四段记忆已经齐全。前往终点，现场可以展开记忆卡核对符号。";
  renderFieldHint();
  const signature = `${view.level.id}:${view.solved.join(",")}:${view.sideTasks.join(",")}:${view.completed}`;
  if (signature !== contentSignature) {
    contentSignature = signature;
    renderInventory(view);
    renderJournal(view);
  }
};

game = new CampaignGame(canvas, {
  onView: updateView,
  onToast: showToast,
  onPuzzle: openPuzzle,
  onFinal: openCode,
  onDeath: (info) => {
    byId("deathTime").textContent = info.time;
    byId("deathCause").textContent = info.cause;
    byId("deathLesson").textContent = info.lesson;
    showOverlay(deathOverlay);
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
  byId("inventoryGrid").innerHTML = found.length
    ? found
        .map(
          (q) =>
            `<div class="inventory-item"><span>${q.icon}</span><b>${q.rewardItem}</b><small>${q.symbol}＝${q.rewardDigit} · 终点记忆</small></div>`,
        )
        .join("")
    : `<div class="empty-state"><span>◇</span><p>背包还是空的。<br>调查真实物件，收集今天的线索。</p></div>`;
  byId("quickbar").innerHTML = [0, 1, 2, 3, 4]
    .map((index) => {
      const q = found[index];
      return `<button class="quick-slot ${q || index === 4 ? "filled" : ""}" aria-label="${index === 4 ? "翻看生活日志" : q ? `查看${q.rewardItem}` : "空道具格"}" ${!q && index !== 4 ? "disabled" : ""} data-pocket="${index === 4 ? "journal" : "inventory"}"><small>${index === 4 ? "▤" : index + 1}</small>${index === 4 ? "<span>▤</span>" : q ? `<span>${q.icon}</span><b>${q.rewardItem}</b>` : ""}</button>`;
    })
    .join("");
  byId("quickbar")
    .querySelectorAll<HTMLButtonElement>("button")
    .forEach((button) =>
      button.addEventListener("click", () => {
        openDrawer();
        document
          .querySelector<HTMLButtonElement>(
            `[data-tab='${button.dataset.pocket}']`,
          )
          ?.click();
      }),
    );
}

function renderJournal(view: CampaignView) {
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
  byId("sideList").innerHTML = view.level.sideTasks
    .map(
      (side) =>
        `<div class="side-row ${view.sideTasks.includes(side.id) ? "done" : ""}"><i>${side.icon}</i><span><b>${side.title}</b><small>${view.sideTasks.includes(side.id) ? side.completeText : side.prompt}</small></span></div>`,
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
    controls.innerHTML = `<div class="choice-grid">${puzzleOptions.map((option, index) => `<button data-option="${option}"><i>${String.fromCharCode(65 + index)}</i>${option}</button>`).join("")}</div>`;
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

function openDrawer() {
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  byId("menuButton").setAttribute("aria-expanded", "true");
  game.setPaused(true);
  audio.play({ id: "ui.drawer.open" });
}
function closeDrawer() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  byId("menuButton").setAttribute("aria-expanded", "false");
  if (
    ![
      campaignOverlay,
      puzzleOverlay,
      codeOverlay,
      deathOverlay,
      completeOverlay,
    ].some((overlay) => !overlay.hidden && overlay.classList.contains("active"))
  )
    game.setPaused(false);
  audio.play({ id: "ui.drawer.close" });
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
    document
      .querySelectorAll("[data-tab]")
      .forEach((item) => item.classList.toggle("active", item === button));
    document
      .querySelectorAll<HTMLElement>("[data-panel]")
      .forEach((panel) =>
        panel.classList.toggle(
          "active",
          panel.dataset.panel === button.dataset.tab,
        ),
      );
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
  if (event.key !== "Escape") return;
  if (!puzzleOverlay.hidden && !puzzleCompleting) byId("puzzleClose").click();
  else if (!codeOverlay.hidden) byId("codeClose").click();
  else if (drawer.classList.contains("open")) closeDrawer();
});
renderCampaign();

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
  review.querySelectorAll<HTMLButtonElement>("button").forEach((button) =>
    button.addEventListener("click", () => {
      [
        campaignOverlay,
        puzzleOverlay,
        codeOverlay,
        deathOverlay,
        completeOverlay,
      ].forEach(hideOverlay);
      drawer.classList.remove("open");
      activePuzzle = null;
      puzzleCompleting = false;
      selectedLevel = Number(button.dataset.reviewLevel);
      game.startLevel(selectedLevel, true);
    }),
  );
}
