import { CoreballEngine } from "./engine";
import { LEVEL_COUNT } from "./levels";
import { AudioSynth } from "./audio";
import { loadProgress, saveProgress, type Progress } from "./storage";
import { track } from "./analytics";

declare global {
  interface Window { __COREBALL_I18N__?: Record<string, string>; }
}

const DEFAULT_I18N: Record<string, string> = {
  play: "Play Coreball",
  playSub: "500 levels. Tap, click or press Space to shoot.",
  continueLabel: "Continue \u2013 Level {0}",
  level: "Level {0}",
  ballsLeft: "Balls: {0}",
  levelComplete: "Level {0} Complete",
  nextLevelSub: "Get ready for Level {0}",
  nextLevel: "Next Level",
  levels: "Levels",
  tryAgain: "Try Again",
  gameOver: "Game Over",
  allClear: "All Levels Complete!",
  allClearSub: "You cleared all 500 levels. Amazing!",
  paused: "Paused",
  resume: "Resume",
  soundOn: "Sound: ON",
  soundOff: "Sound: OFF",
  close: "Close",
  levelSelectTitle: "Select a Level",
  locked: "Level {0} locked",
  completed: "Level {0} completed",
  currentLevel: "Level {0} (current)",
  statusReady: "Coreball ready. Press Play to start.",
  statusPlaying: "Level {0}. {1} balls left.",
  statusFailed: "Game over on level {0}.",
  statusSuccess: "Level {0} complete.",
  statusPaused: "Game paused.",
};

const I18N: Record<string, string> = { ...DEFAULT_I18N, ...(window.__COREBALL_I18N__ ?? {}) };

function t(key: string): string {
  return I18N[key] ?? DEFAULT_I18N[key] ?? key;
}

function fmt(template: string, args: Array<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)] ?? ""));
}

function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error("Missing element: " + id);
  return node as T;
}

const canvas = $<HTMLCanvasElement>("coreball-canvas");
const overlay = $<HTMLDivElement>("game-overlay");
const readyPanel = $<HTMLDivElement>("overlay-ready");
const successPanel = $<HTMLDivElement>("overlay-success");
const failedPanel = $<HTMLDivElement>("overlay-failed");
const pausedPanel = $<HTMLDivElement>("overlay-paused");
const readyTitle = $<HTMLHeadingElement>("ready-title");
const readySub = $<HTMLParagraphElement>("ready-sub");
const btnPlay = $<HTMLButtonElement>("btn-play");
const successTitle = $<HTMLHeadingElement>("success-title");
const successSub = $<HTMLParagraphElement>("success-sub");
const btnNext = $<HTMLButtonElement>("btn-next");
const btnLevelsSuccess = $<HTMLButtonElement>("btn-levels-success");
const failedTitle = $<HTMLHeadingElement>("failed-title");
const failedSub = $<HTMLParagraphElement>("failed-sub");
const btnRetry = $<HTMLButtonElement>("btn-retry");
const btnLevelsFailed = $<HTMLButtonElement>("btn-levels-failed");
const pausedTitle = $<HTMLHeadingElement>("paused-title");
const btnResume = $<HTMLButtonElement>("btn-resume");
const hudLevel = $<HTMLSpanElement>("hud-level");
const hudBalls = $<HTMLSpanElement>("hud-balls");
const progressFill = $<HTMLDivElement>("progress-fill");
const hudStatus = $<HTMLParagraphElement>("hud-status");
const btnSound = $<HTMLButtonElement>("btn-sound");
const soundLabel = $<HTMLSpanElement>("sound-label");
const btnLevels = $<HTMLButtonElement>("btn-levels");
const modal = $<HTMLDialogElement>("level-modal");
const modalTitle = $<HTMLHeadingElement>("level-modal-title");
const modalGrid = $<HTMLDivElement>("level-grid");
const btnCloseModal = $<HTMLButtonElement>("level-close");

let progress: Progress = loadProgress();
let currentLevel = Math.max(1, Math.min(LEVEL_COUNT, progress.unlocked));
let hasStarted = false;

const engine = new CoreballEngine();
const audio = new AudioSynth();
audio.setEnabled(progress.sound);
updateSoundButton();

engine.attach(canvas, {
  onStateChange: handleStateChange,
  onHud: handleHud,
  onShoot: () => audio.shoot(),
  onAttach: () => audio.attach(),
  onFail: () => audio.fail(),
  onWin: () => audio.win(),
});

function handleStateChange(state: string, level: number): void {
  if (state === "ready") {
    showPanel(readyPanel);
    readyTitle.textContent = t("play");
    readySub.textContent = t("playSub");
    const label = progress.unlocked > 1
      ? fmt(t("continueLabel"), [progress.unlocked])
      : t("play");
    btnPlay.textContent = label;
    hudStatus.textContent = t("statusReady");
    focusPrimary(btnPlay);
  } else if (state === "playing") {
    hideOverlay();
  } else if (state === "success") {
    const allClear = level >= LEVEL_COUNT;
    showPanel(successPanel);
    successTitle.textContent = allClear ? t("allClear") : fmt(t("levelComplete"), [level]);
    successSub.textContent = allClear ? t("allClearSub") : fmt(t("nextLevelSub"), [level + 1]);
    btnNext.hidden = allClear;
    hudStatus.textContent = fmt(t("statusSuccess"), [level]);
    focusPrimary(allClear ? btnLevelsSuccess : btnNext);

    progress.unlocked = Math.min(LEVEL_COUNT, Math.max(progress.unlocked, level + 1));
    saveProgress(progress);
    track("level_complete", { level });
    if (allClear) track("game_complete", { level });
  } else if (state === "failed") {
    showPanel(failedPanel);
    failedTitle.textContent = t("gameOver");
    failedSub.textContent = fmt(t("level"), [level]);
    hudStatus.textContent = fmt(t("statusFailed"), [level]);
    focusPrimary(btnRetry);
    track("level_failed", { level });
  } else if (state === "paused") {
    showPanel(pausedPanel);
    pausedTitle.textContent = t("paused");
    hudStatus.textContent = t("statusPaused");
    focusPrimary(btnResume);
  }
}

function handleHud(hud: { level: number; ballsLeft: number; attached: number; total: number }): void {
  hudLevel.textContent = fmt(t("level"), [hud.level]);
  hudBalls.textContent = fmt(t("ballsLeft"), [hud.ballsLeft]);
  const pct = hud.total > 0 ? Math.round((hud.attached / hud.total) * 100) : 0;
  progressFill.style.width = pct + "%";
  if (engine.state === "playing") {
    hudStatus.textContent = fmt(t("statusPlaying"), [hud.level, hud.ballsLeft]);
  }
}

function startLevel(id: number): void {
  currentLevel = Math.max(1, Math.min(LEVEL_COUNT, id));
  engine.startLevel(currentLevel);
  track("level_start", { level: currentLevel });
}

function play(): void {
  if (!hasStarted) {
    hasStarted = true;
    track("game_start");
  }
  startLevel(currentLevel);
}

function showPanel(panel: HTMLElement): void {
  [readyPanel, successPanel, failedPanel, pausedPanel].forEach((p) => {
    p.hidden = p !== panel;
  });
  overlay.classList.remove("overlay-hidden");
}

function hideOverlay(): void {
  overlay.classList.add("overlay-hidden");
}

function focusPrimary(button: HTMLButtonElement): void {
  requestAnimationFrame(() => button.focus({ preventScroll: true }));
}

function updateSoundButton(): void {
  soundLabel.textContent = audio.enabled ? t("soundOn") : t("soundOff");
  btnSound.setAttribute("aria-pressed", audio.enabled ? "true" : "false");
}

function toggleSound(): void {
  audio.setEnabled(!audio.enabled);
  progress.sound = audio.enabled;
  saveProgress(progress);
  updateSoundButton();
  track("sound_toggle", { state: audio.enabled ? "on" : "off" });
}

btnPlay.addEventListener("click", play);
btnNext.addEventListener("click", () => {
  if (currentLevel < LEVEL_COUNT) startLevel(currentLevel + 1);
});
btnRetry.addEventListener("click", () => {
  track("level_retry", { level: currentLevel });
  startLevel(currentLevel);
});
btnResume.addEventListener("click", () => engine.resume());
btnLevelsSuccess.addEventListener("click", openLevels);
btnLevelsFailed.addEventListener("click", openLevels);
btnLevels.addEventListener("click", openLevels);
btnSound.addEventListener("click", toggleSound);
btnCloseModal.addEventListener("click", closeLevels);

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (engine.state === "ready") play();
  else if (engine.state === "playing") engine.fire();
});

overlay.addEventListener("pointerdown", (e) => {
  if (engine.state !== "ready") return;
  const target = e.target as HTMLElement | null;
  if (target && target.closest("button")) return;
  e.preventDefault();
  play();
});

window.addEventListener("keydown", (e) => {
  const target = e.target as HTMLElement | null;
  const isControl = !!target && (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "A");
  if (isControl || e.repeat) return;
  if ((e.code === "Space" || e.code === "Enter") && !modal.open) {
    e.preventDefault();
    if (engine.state === "ready") play();
    else if (engine.state === "playing") engine.fire();
  }
  if (e.code === "Escape" && modal.open) closeLevels();
});

function openLevels(): void {
  buildLevelGrid();
  modalTitle.textContent = t("levelSelectTitle");
  if (!modal.open) modal.showModal();
  document.body.classList.add("modal-open");
  btnCloseModal.focus({ preventScroll: true });
}

function closeLevels(): void {
  if (modal.open) modal.close();
  document.body.classList.remove("modal-open");
}

function buildLevelGrid(): void {
  modalGrid.textContent = "";
  const frag = document.createDocumentFragment();
  for (let lv = 1; lv <= LEVEL_COUNT; lv++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-btn";
    if (lv === currentLevel) btn.classList.add("level-btn-current");
    if (lv < progress.unlocked) {
      btn.classList.add("level-btn-done");
      btn.textContent = lv + " \u2713";
      btn.setAttribute("aria-label", fmt(t("completed"), [lv]));
    } else if (lv > progress.unlocked) {
      btn.classList.add("level-btn-locked");
      btn.textContent = lv + " \ud83d\udd12";
      btn.setAttribute("aria-label", fmt(t("locked"), [lv]));
      btn.disabled = true;
    } else {
      btn.textContent = String(lv);
      btn.setAttribute("aria-label", fmt(t("currentLevel"), [lv]));
    }
    btn.addEventListener("click", () => selectLevel(lv));
    frag.appendChild(btn);
  }
  modalGrid.appendChild(frag);
}

function selectLevel(lv: number): void {
  if (lv > progress.unlocked) return;
  track("level_select", { level: lv });
  closeLevels();
  if (!hasStarted) {
    hasStarted = true;
    track("game_start");
  }
  startLevel(lv);
}

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeLevels();
});

function fitCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(120, Math.round(rect.width));
  const h = Math.max(120, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  engine.setDpr(dpr);
  engine.resize(w, h);
}

const resizeObserver = new ResizeObserver(() => fitCanvas());
resizeObserver.observe(canvas);
fitCanvas();

document.addEventListener("visibilitychange", () => {
  if (document.hidden && engine.state === "playing") engine.pause();
});

window.addEventListener("load", () => {
  fitCanvas();
});
