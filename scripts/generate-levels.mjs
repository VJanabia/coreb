// Generates a deterministic, original 500-level data set for CoreBall.
// Seeded PRNG per level => Level N always has the exact same layout.
// Layout fairness is validated: every gap between adjacent pins stays wide
// enough for a projectile to pass using the game's collision margin.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVEL_COUNT = 500;

// Must stay in sync with the game's constants (src/game/engine.ts).
const SHAFT_RATIO = 0.38;
const HEAD_BASE = 0.118;
const HEAD_PER = 0.0016;
const HEAD_MIN = 0.078;
const GAME_MARGIN = 0.8;
const SAFETY = 1.05;

const headScale = (total) => Math.max(HEAD_MIN, HEAD_BASE - HEAD_PER * total);
const rhRatio = (total) => 1 + SHAFT_RATIO + headScale(total);
const minGapDeg = (total) => {
  const s = Math.min(0.999, (headScale(total) * 2 * GAME_MARGIN * SAFETY) / rhRatio(total));
  return (2 * Math.asin(s) * 180) / Math.PI;
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shotsFor(id) { return Math.min(5 + (id - 1), 30); }

function initialPinCount(id, rnd) {
  if (id < 60) return 0;
  if (id < 150) return rnd() < 0.3 ? 1 : 0;
  if (id < 300) {
    const r = rnd();
    return r < 0.12 ? 2 : r < 0.5 ? 1 : 0;
  }
  if (id < 430) {
    const r = rnd();
    return r < 0.35 ? 0 : r < 0.78 ? 1 : 2;
  }
  const r = rnd();
  return r < 0.22 ? 1 : r < 0.7 ? 2 : 3;
}

function typeFor(id, rnd) {
  if (id <= 12) return 'normal';
  if (id <= 30) return rnd() < 0.25 ? 'fast' : 'normal';
  if (id <= 60) return ['normal','normal','fast','accel','slow'][Math.floor(rnd()*5)];
  if (id <= 100) return ['normal','fast','accel','mirror','slow'][Math.floor(rnd()*5)];
  if (id <= 200) return ['normal','fast','accel','mirror','dense'][Math.floor(rnd()*5)];
  return ['normal','fast','fast','accel','mirror','dense'][Math.floor(rnd()*6)];
}

function baseSpeed(id) {
  if (id <= 10) return 38 + (id - 1) * 1.6;
  if (id <= 30) return 54 + (id - 11) * 1.2;
  if (id <= 60) return 80 + (id - 31) * 0.75;
  if (id <= 100) return 104 + (id - 61) * 0.6;
  if (id <= 200) return 118 + (id - 101) * 0.32;
  if (id <= 350) return 152 + (id - 201) * 0.16;
  return 178 + (id - 351) * 0.18;
}

const TYPE_SPEED = { normal: 1, fast: 1.18, slow: 0.82, accel: 0.92, mirror: 1, dense: 1.08 };

function difficultyOf(id) {
  if (id <= 8) return 1;
  if (id <= 25) return 2;
  if (id <= 60) return 3;
  if (id <= 150) return 4;
  return 5;
}

function buildLevel(id) {
  const rnd = mulberry32(id * 2654435761 + 1013904223);
  const shots = shotsFor(id);
  let initial = initialPinCount(id, rnd);
  const type = typeFor(id, rnd);
  const gap = 360 / (shots + initial);
  const need = minGapDeg(shots + initial);
  while (initial > 0 && gap < need * 1.05) initial--;
  const totalPins = shots + initial;
  const baseGap = 360 / totalPins;
  const needGap = minGapDeg(totalPins);
  let jitterMax = Math.min(0.3, (baseGap - needGap) / (2 * baseGap));
  if (jitterMax < 0) jitterMax = 0;
  if (type === 'dense') jitterMax *= 0.45;
  if (type === 'mirror') jitterMax = Math.min(jitterMax, 0.22);

  const offset = rnd() * 360;
  const jitters = new Array(totalPins);
  for (let i = 0; i < totalPins; i++) {
    let j = (rnd() * 2 - 1) * baseGap * jitterMax;
    if (type === 'mirror' && i >= Math.ceil(totalPins / 2)) j = -jitters[totalPins - 1 - i];
    jitters[i] = j;
  }
  const angles = [];
  for (let i = 0; i < totalPins; i++) {
    let a = (offset + i * baseGap + jitters[i]) % 360;
    if (a < 0) a += 360;
    angles.push(Math.round(a * 10) / 10);
  }
  angles.sort((a, b) => a - b);

  for (let i = 0; i < totalPins; i++) {
    const next = angles[(i + 1) % totalPins] + (i === totalPins - 1 ? 360 : 0);
    const g = next - angles[i];
    if (g < needGap * 0.98) {
      throw new Error('level ' + id + ' unfair: gap ' + g.toFixed(2) + 'deg < required ' + needGap.toFixed(2) + 'deg');
    }
  }

  const idx = Array.from({ length: totalPins }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const ip = idx.slice(0, initial).map((i) => angles[i]).sort((a, b) => a - b);

  let sp = Math.round(baseSpeed(id) * TYPE_SPEED[type] * 100) / 100;
  const dirProb = id >= 300 ? 0.55 : id >= 150 ? 0.45 : 0.3;
  const dir = id >= 31 ? (rnd() < dirProb ? -1 : 1) : 1;

  return { i: id, sp, d: dir, ip, q: shots, t: type, dv: difficultyOf(id) };
}

const levels = [];
let minSpeed = Infinity, maxSpeed = -Infinity;
const typeCount = {};
for (let id = 1; id <= LEVEL_COUNT; id++) {
  const lv = buildLevel(id);
  levels.push(lv);
  minSpeed = Math.min(minSpeed, lv.sp);
  maxSpeed = Math.max(maxSpeed, lv.sp);
  typeCount[lv.t] = (typeCount[lv.t] || 0) + 1;
}

const out = resolve(__dirname, '../src/game/data/levels.generated.ts');
mkdirSync(dirname(out), { recursive: true });
const rows = levels.map((l) => JSON.stringify(l)).join(',\n  ');
writeFileSync(
  out,
  '// AUTO-GENERATED by scripts/generate-levels.mjs - do not edit by hand.\n' +
    '// 500 original, deterministic CoreBall levels. Compact form:\n' +
    '// { i: id, sp: speed(deg/s), d: direction(1|-1), ip: initial pin angles(deg),\n' +
    '//   q: shots, t: type, dv: difficulty 1-5 }\n' +
    'export const LEVELS = [\n  ' + rows + '\n];\n'
);
console.log('Generated ' + levels.length + ' levels. speed ' + minSpeed + '-' + maxSpeed + ' deg/s. types: ' + JSON.stringify(typeCount) + '. wrote src/game/data/levels.generated.ts');
