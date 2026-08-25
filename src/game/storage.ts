// Progress persistence (localStorage only - no accounts, no server).
const KEY = "coreball.progress.v1";

export interface Progress {
  /** highest unlocked level id (levels 1..unlocked are playable) */
  unlocked: number;
  /** sound enabled? */
  sound: boolean;
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      const unlocked = Number(parsed.unlocked);
      return {
        unlocked: Number.isFinite(unlocked) ? Math.max(1, Math.min(500, Math.floor(unlocked))) : 1,
        sound: parsed.sound === true,
      };
    }
  } catch {
    // corrupted or unavailable storage -> start fresh
  }
  return { unlocked: 1, sound: false };
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked - gameplay continues, saving is best-effort
  }
}
