// GA4 event bridge. The gtag snippet is injected by the page templates
// (only when a measurement id is configured at build time).
export interface GameEventParams {
  level?: number;
  state?: string;
  [key: string]: unknown;
}

type GtagFn = (cmd: "event", event: string, params?: GameEventParams) => void;

export function track(event: string, params?: GameEventParams): void {
  try {
    const gtag = (window as unknown as { gtag?: GtagFn }).gtag;
    if (typeof gtag === "function") gtag("event", event, params);
  } catch {
    // analytics must never break gameplay
  }
}
