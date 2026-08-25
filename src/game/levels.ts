// Level data model + mapping from the compact generated data file.
// The generated data (scripts/generate-levels.mjs) is original and deterministic:
// level N always produces the exact same layout. See scripts/ for the generator.
export type LevelType =
  | "normal"
  | "fast"
  | "slow"
  | "accel"
  | "mirror"
  | "dense"
  | "cluster"
  | "narrow";

export interface Level {
  /** 1-based level id */
  id: number;
  /** core rotation speed in degrees per second */
  speed: number;
  /** 1 = clockwise, -1 = counter-clockwise */
  dir: 1 | -1;
  /** angles (degrees, core-space) of pins that start attached to the core */
  initial: number[];
  /** how many pins the player must successfully attach */
  shots: number;
  type: LevelType;
  /** rough difficulty 1..5 */
  difficulty: number;
}

interface LevelCompact {
  i: number;
  sp: number;
  d: 1 | -1;
  ip: number[];
  q: number;
  t: string;
  dv: number;
}

import { LEVELS } from "./data/levels.generated";

const LEVEL_MAP = new Map<number, Level>();
for (const c of LEVELS as LevelCompact[]) {
  LEVEL_MAP.set(c.i, {
    id: c.i,
    speed: c.sp,
    dir: c.d,
    initial: c.ip,
    shots: c.q,
    type: c.t as LevelType,
    difficulty: c.dv,
  });
}

export const LEVEL_COUNT = LEVELS.length;

export function getLevel(id: number): Level {
  const lv = LEVEL_MAP.get(id);
  if (!lv) throw new Error("Unknown level: " + id);
  return lv;
}

export function totalPins(lv: Level): number {
  return lv.shots + lv.initial.length;
}
