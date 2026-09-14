// Progress persistence (localStorage only - no accounts, no server).
const KEY = "coreball.progress.v1";

/** The first 50 levels are playable from the very first visit. */
export const DEFAULT_UNLOCKED = 50;
/** Safety cap for level ids. */
const MAX_LEVEL = 500;

export interface Progress {
  /** highest playable level id (levels 1..unlocked can be selected) */
  unlocked: number;
  /** highest level actually cleared (0 = none yet) - drives the check marks */
  cleared: number;
  /** sound enabled? */
  sound: boolean;
}

const clampLevel = (n: number, min: number) => Math.max(min, Math.min(MAX_LEVEL, Math.floor(n)));

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      const storedUnlocked = Number(parsed.unlocked);
      const unlocked = Number.isFinite(storedUnlocked)
        ? clampLevel(storedUnlocked, 1)
        : DEFAULT_UNLOCKED;
      // legacy saves only had "unlocked", where unlocked = cleared + 1
      const storedCleared = Number(parsed.cleared);
      const cleared = Number.isFinite(storedCleared)
        ? clampLevel(storedCleared, 0)
        : unlocked > 1 ? unlocked - 1 : 0;
      return {
        // always grant at least the default opening levels
        unlocked: Math.max(DEFAULT_UNLOCKED, unlocked),
        cleared: Math.min(cleared, MAX_LEVEL),
        sound: parsed.sound === true,
      };
    }
  } catch {
    // corrupted or unavailable storage -> start fresh
  }
  return { unlocked: DEFAULT_UNLOCKED, cleared: 0, sound: false };
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked - gameplay continues, saving is best-effort
  }
}
