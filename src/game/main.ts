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
  levelOfTotal: "Level {0} / {1}",
  pins: "Pins: {0}",
  pauseLabel: "Pause",
  restartLabel: "Restart",
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
  statusPlaying: "Level {0}. {1} pins left.",
  statusFailed: "Game over on level {0}. Tap to retry.",
  tapToRetry: "Tap to Retry",
  tapToNext: "Tap for Next Level",
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
const pausedPanel = $<HTMLDivElement>("overlay-paused");
const readyTitle = $<HTMLHeadingElement>("ready-title");
const readySub = $<HTMLParagraphElement>("ready-sub");
const btnPlay = $<HTMLButtonElement>("btn-play");
const pausedTitle = $<HTMLHeadingElement>("paused-title");
const btnResume = $<HTMLButtonElement>("btn-resume");
const hudLevel = $<HTMLSpanElement>("hud-level");
const hudBalls = $<HTMLSpanElement>("hud-balls");
const hudDots = $<HTMLSpanElement>("hud-dots");
const progressFill = $<HTMLDivElement>("progress-fill");
const hudStatus = $<HTMLParagraphElement>("hud-status");
const btnSound = $<HTMLButtonElement>("btn-sound");
const soundLabel = $<HTMLSpanElement>("sound-label");
const btnPause = $<HTMLButtonElement>("btn-pause");
const pauseLabel = $<HTMLSpanElement>("pause-label");
const btnRestart = $<HTMLButtonElement>("btn-restart");
const btnLevels = $<HTMLButtonElement>("btn-levels");
const levelBanner = $<HTMLDivElement>("level-banner");
const retryToast = $<HTMLDivElement>("retry-toast");
const modal = $<HTMLDialogElement>("level-modal");
const modalTitle = $<HTMLHeadingElement>("level-modal-title");
const modalGrid = $<HTMLDivElement>("level-grid");
const btnCloseModal = $<HTMLButtonElement>("level-close");

let progress: Progress = loadProgress();
let currentLevel = Math.max(1, Math.min(LEVEL_COUNT, progress.unlocked));
let hasStarted = false;
let bannerTimer = 0;
let toastTimer = 0;
let failAt = 0;
const RETRY_DELAY_MS = 350; // short lock so accidental extra taps do not skip the level

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
  document.body.setAttribute("data-game-state", state);
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
  } else if (state === "flyoff") {
    // level cleared: pins just flew off the screen. Save progress + analytics
    // now; a "tap to next" toast appears once the fly-off finishes ("success").
    hideOverlay();
    hudStatus.textContent = fmt(t("statusSuccess"), [level]);
    progress.unlocked = Math.min(LEVEL_COUNT, Math.max(progress.unlocked, level + 1));
    saveProgress(progress);
    track("level_complete", { level });
    if (level >= LEVEL_COUNT) track("game_complete", { level });
  } else if (state === "success") {
    // fly-off finished: no Level Complete screen, just "tap to next"
    hideOverlay();
    const allClear = level >= LEVEL_COUNT;
    showToast(allClear ? t("allClear") : t("tapToNext"), true, true);
    hudStatus.textContent = allClear ? t("allClear") : fmt(t("statusSuccess"), [level]);
  } else if (state === "failed") {
    // no Game Over screen: after a short fail feedback the player just taps
    // anywhere (or presses Space/Enter) to restart the same level instantly
    hideOverlay();
    hudStatus.textContent = fmt(t("statusFailed"), [level]);
    failAt = performance.now();
    showToast(t("tapToRetry"), false, false);
    track("level_failed", { level });
  } else if (state === "paused") {
    showPanel(pausedPanel);
    pausedTitle.textContent = t("paused");
    hudStatus.textContent = t("statusPaused");
    focusPrimary(btnResume);
  }
  const inRun = state === "playing" || state === "paused";
  btnPause.disabled = !inRun;
  pauseLabel.textContent = state === "paused" ? t("resume") : t("pauseLabel");
  btnPause.setAttribute("aria-pressed", state === "paused" ? "true" : "false");
}

function handleHud(hud: { level: number; ballsLeft: number; attached: number; total: number }): void {
  hudLevel.textContent = fmt(t("levelOfTotal"), [hud.level, LEVEL_COUNT]);
  hudBalls.textContent = fmt(t("pins"), [hud.ballsLeft]);
  const dots = Math.min(hud.ballsLeft, 12);
  hudDots.textContent = "\u25cf ".repeat(dots).trim() + (hud.ballsLeft > 12 ? " +" + (hud.ballsLeft - 12) : "");
  const pct = hud.total > 0 ? Math.round((hud.attached / hud.total) * 100) : 0;
  progressFill.style.width = pct + "%";
  if (engine.state === "playing") {
    hudStatus.textContent = fmt(t("statusPlaying"), [hud.level, hud.ballsLeft]);
  }
}

function startLevel(id: number): void {
  retryToast.hidden = true;
  window.clearTimeout(toastTimer);
  currentLevel = Math.max(1, Math.min(LEVEL_COUNT, id));
  engine.startLevel(currentLevel);
  track("level_start", { level: currentLevel });
  levelBanner.textContent = fmt(t("level"), [currentLevel]);
  levelBanner.hidden = false;
  window.clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => {
    levelBanner.hidden = true;
  }, 950);
}

function play(): void {
  if (!hasStarted) {
    hasStarted = true;
    track("game_start");
  }
  startLevel(currentLevel);
}

function showPanel(panel: HTMLElement): void {
  [readyPanel, pausedPanel].forEach((p) => {
    p.hidden = p !== panel;
  });
  overlay.classList.remove("overlay-hidden");
}

function retryLevel(): void {
  retryToast.hidden = true;
  window.clearTimeout(toastTimer);
  track("level_retry", { level: currentLevel });
  startLevel(currentLevel);
}

function hideOverlay(): void {
  overlay.classList.add("overlay-hidden");
}

function focusPrimary(button: HTMLButtonElement): void {
  requestAnimationFrame(() => button.focus({ preventScroll: true }));
}

// Central toast: optional auto-hide, optional success (teal) styling.
function showToast(text: string, hold: boolean, success: boolean): void {
  retryToast.textContent = text;
  retryToast.className = "retry-toast" + (hold ? " toast-hold" : "") + (success ? " toast-success" : "");
  retryToast.hidden = false;
  window.clearTimeout(toastTimer);
  if (!hold) {
    toastTimer = window.setTimeout(() => {
      retryToast.hidden = true;
    }, 1500);
  }
}

// Tap-to-next after a cleared level.
function nextFromSuccess(): void {
  retryToast.hidden = true;
  window.clearTimeout(toastTimer);
  if (currentLevel >= LEVEL_COUNT) {
    openLevels();
    return;
  }
  startLevel(currentLevel + 1);
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
btnResume.addEventListener("click", () => engine.resume());
btnLevels.addEventListener("click", openLevels);
btnSound.addEventListener("click", toggleSound);
btnCloseModal.addEventListener("click", closeLevels);
btnPause.addEventListener("click", () => {
  if (engine.state === "playing") engine.pause();
  else if (engine.state === "paused") engine.resume();
});
btnRestart.addEventListener("click", () => {
  track("level_retry", { level: currentLevel });
  startLevel(currentLevel);
});

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (engine.state === "ready") play();
  else if (engine.state === "playing") engine.fire();
  else if (engine.state === "failed" && performance.now() - failAt > RETRY_DELAY_MS) {
    retryLevel();
  } else if (engine.state === "success") {
    nextFromSuccess();
  }
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
    else if (engine.state === "failed" && performance.now() - failAt > RETRY_DELAY_MS) {
      retryLevel();
    } else if (engine.state === "success") {
      nextFromSuccess();
    }
  }
  if (e.code === "KeyP" && !modal.open) {
    if (engine.state === "playing") engine.pause();
    else if (engine.state === "paused") engine.resume();
  }
  if (e.code === "KeyR" && !modal.open && engine.state !== "loading") {
    track("level_retry", { level: currentLevel });
    startLevel(currentLevel);
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
