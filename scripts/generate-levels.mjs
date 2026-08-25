// Generates a deterministic, original 500-level data set for CoreBall.
// Seeded PRNG per level => Level N always has the exact same layout.
// Every level starts with pre-inserted pins (initialPins >= 2) that are real
// collision objects. Layout fairness is validated: every gap between adjacent
// pins stays wide enough for a projectile to pass using the game's margin.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEVEL_COUNT = 500;

// Must stay in sync with the game's constants (src/game/engine.ts).
const SHAFT_RATIO = 0.6;       // shaft length relative to core radius (long, visible pins)
const HEAD_BASE = 0.135;       // pin head radius at small pin counts
const HEAD_PER = 0.0016;       // shrink per extra pin
const HEAD_MIN = 0.08;
const GAME_MARGIN = 0.8;       // game fails when head distance < 2*headR*MARGIN
const SAFETY = 1.05;           // keep gaps >= threshold * SAFETY so a centered shot always passes

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

// ---------------------------------------------------------------- difficulty curve
// initial pins: every level starts with 2..16 pre-inserted pins
function initialPinsFor(id) {
  if (id <= 20) return 2 + Math.floor((id - 1) / 3);        // 2..8
  if (id <= 60) return 8 + Math.floor((id - 21) / 5);       // 8..15
  if (id <= 200) return 14 + (id % 3 === 0 ? 1 : 0);        // 14..15
  return 15 + (id % 4 === 0 ? 1 : 0);                       // 15..16
}

// total pins on the finished core (initial + shots); capped so gaps stay fair
function totalTarget(id) {
  return Math.min(8 + Math.floor((id - 1) * 1.15), 36);
}

function shotsFor(id) {
  return Math.max(4, totalTarget(id) - initialPinsFor(id));
}

function typeFor(id, rnd) {
  if (id <= 6) return "normal";
  if (id <= 14) return ["normal", "normal", "cluster", "mirror"][Math.floor(rnd() * 4)];
  if (id <= 30) return ["normal", "fast", "cluster", "mirror"][Math.floor(rnd() * 4)];
  if (id <= 60) return ["normal", "fast", "accel", "mirror", "cluster", "slow"][Math.floor(rnd() * 6)];
  if (id <= 100) return ["normal", "fast", "accel", "mirror", "cluster", "narrow", "dense", "slow"][Math.floor(rnd() * 8)];
  if (id <= 200) return ["normal", "fast", "accel", "mirror", "cluster", "narrow", "dense"][Math.floor(rnd() * 7)];
  return ["fast", "fast", "accel", "mirror", "cluster", "narrow", "dense"][Math.floor(rnd() * 7)];
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

const TYPE_SPEED = {
  normal: 1, fast: 1.18, slow: 0.82, accel: 0.92,
  mirror: 1, dense: 1.08, cluster: 1.0, narrow: 1.05,
};

function difficultyOf(id) {
  if (id <= 8) return 1;
  if (id <= 25) return 2;
  if (id <= 60) return 3;
  if (id <= 150) return 4;
  return 5;
}

// ---------------------------------------------------------------- layout builders
const norm = (a) => ((a % 360) + 360) % 360;

function validateGaps(angles, needGap) {
  for (let i = 0; i < angles.length; i++) {
    const next = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? 360 : 0);
    if (next - angles[i] < needGap * 0.98) return false;
  }
  return true;
}

// Pattern A/E/F/G: even spacing + seeded jitter
function evenAngles(total, needGap, rnd, jitterScale = 1) {
  const baseGap = 360 / total;
  let jitterMax = Math.min(0.3, (baseGap - needGap) / (2 * baseGap));
  if (jitterMax < 0) jitterMax = 0;
  jitterMax *= jitterScale;
  const off = rnd() * 360;
  const angles = [];
  for (let i = 0; i < total; i++) {
    angles.push(norm(off + i * baseGap + (rnd() * 2 - 1) * baseGap * jitterMax));
  }
  angles.sort((a, b) => a - b);
  return validateGaps(angles, needGap) ? { angles, clusterCount: 0 } : null;
}

// Pattern B: symmetric layout
function mirrorAngles(total, needGap, rnd) {
  const baseGap = 360 / total;
  let jitterMax = Math.min(0.22, (baseGap - needGap) / (2 * baseGap));
  if (jitterMax < 0) jitterMax = 0;
  const off = rnd() * 360;
  const jitters = new Array(total);
  for (let i = 0; i < total; i++) {
    let j = (rnd() * 2 - 1) * baseGap * jitterMax;
    if (i >= Math.ceil(total / 2)) j = -jitters[total - 1 - i];
    jitters[i] = j;
  }
  const angles = [];
  for (let i = 0; i < total; i++) angles.push(norm(off + i * baseGap + jitters[i]));
  angles.sort((a, b) => a - b);
  return validateGaps(angles, needGap) ? { angles, clusterCount: 0 } : null;
}

// Pattern C/D: one dense cluster (+ spread rest) or two dense clusters with open gaps
function clusterAngles(total, needGap, rnd) {
  const intra = needGap * (1.18 + rnd() * 0.14);
  const singleSide = rnd() < 0.45;
  const s1 = singleSide
    ? Math.max(2, Math.floor(total * (0.5 + rnd() * 0.2)))
    : 2 + Math.floor(rnd() * Math.max(1, total - 5));
  const s2 = total - s1;
  const span1 = (s1 - 1) * intra;
  const margin = needGap * 1.5;
  const angles = [];
  const off0 = rnd() * 360;
  for (let i = 0; i < s1; i++) angles.push(off0 + i * intra);

  if (singleSide) {
    const arcLen = 360 - span1 - 2 * margin;
    if (arcLen < needGap * (s2 - 1)) return null;
    const step = arcLen / (s2 - 1);
    const start = off0 + span1 + margin;
    for (let i = 0; i < s2; i++) angles.push(start + i * step);
  } else {
    const span2 = (s2 - 1) * intra;
    if (span1 + span2 + 2 * margin > 360) return null;
    const free = 360 - span1 - span2 - 2 * margin;
    const gap1 = margin + rnd() * free;
    const start2 = off0 + span1 + gap1;
    for (let i = 0; i < s2; i++) angles.push(start2 + i * intra);
  }
  const sorted = angles.map(norm).sort((a, b) => a - b);
  return validateGaps(sorted, needGap) ? { angles: sorted, clusterCount: s1 } : null;
}

// Pattern H: one deliberately narrow gap, the rest wider
function narrowAngles(total, needGap, rnd) {
  const pinch = needGap * (1.03 + rnd() * 0.07);
  const otherGap = (360 - pinch) / (total - 1);
  if (otherGap < needGap * 1.05) return null;
  const jitterMax = Math.min(0.12, (otherGap - needGap) / (2 * otherGap));
  const off = rnd() * 360;
  const pinchIdx = Math.floor(rnd() * (total - 1));
  const angles = [off];
  let acc = off;
  for (let i = 0; i < total - 1; i++) {
    const gap = i === pinchIdx ? pinch : otherGap * (1 + (rnd() * 2 - 1) * jitterMax);
    acc += gap;
    angles.push(acc);
  }
  const sorted = angles.map(norm).sort((a, b) => a - b);
  if (!validateGaps(sorted, needGap)) return null;
  // find the narrowest gap so initial pins can be chosen on its far side
  let minIdx = 0;
  let minG = Infinity;
  for (let i = 0; i < total; i++) {
    const next = sorted[(i + 1) % total] + (i === total - 1 ? 360 : 0);
    const g = next - sorted[i];
    if (g < minG) { minG = g; minIdx = i; }
  }
  return { angles: sorted, clusterCount: 0, narrowGapIdx: minIdx };
}

// ---------------------------------------------------------------- level builder
function buildLevel(id) {
  const rnd = mulberry32(id * 2654435761 + 1013904223);
  const type = typeFor(id, rnd);
  const shots = shotsFor(id);
  const initial = initialPinsFor(id);
  const total = shots + initial;
  const needGap = minGapDeg(total);

  let layout = null;
  if (type === "cluster") layout = clusterAngles(total, needGap, rnd);
  else if (type === "narrow") layout = narrowAngles(total, needGap, rnd);
  else if (type === "mirror") layout = mirrorAngles(total, needGap, rnd);
  if (!layout) layout = evenAngles(total, needGap, rnd, type === "dense" ? 0.45 : 1);
  if (!layout) layout = evenAngles(total, needGap, rnd, 0);
  if (!layout) throw new Error("level " + id + ": no fair layout for total=" + total);

  // round to 0.1deg to keep the data compact (bundle size matters)
  const angles = layout.angles.map((a) => Math.round(a * 10) / 10);
  for (let i = 0; i < angles.length; i++) {
    const next = angles[(i + 1) % angles.length] + (i === angles.length - 1 ? 360 : 0);
    if (next - angles[i] < needGap * 0.98) {
      throw new Error("level " + id + " unfair after rounding: gap " + (next - angles[i]).toFixed(2));
    }
  }

  // deterministic pick of the pre-inserted pins
  let ipIdx;
  if (type === "cluster" && layout.clusterCount > 0) {
    // the dense cluster is already inserted; the player fills the open side
    ipIdx = Array.from({ length: layout.clusterCount }, (_, i) => i);
  } else if (type === "narrow" && typeof layout.narrowGapIdx === "number") {
    // insert pins on the far side of the narrow gap so it stays visible
    const start = (layout.narrowGapIdx + 1) % total;
    ipIdx = Array.from({ length: initial }, (_, i) => (start + i) % total);
  } else {
    // contiguous block => one big open arc to fill (a readable "puzzle")
    const start = Math.floor(rnd() * total);
    ipIdx = Array.from({ length: initial }, (_, i) => (start + i) % total);
  }
  const ip = ipIdx.map((i) => angles[i]).sort((a, b) => a - b);

  let sp = Math.round(baseSpeed(id) * TYPE_SPEED[type] * 100) / 100;
  const dirProb = id >= 250 ? 0.5 : id >= 80 ? 0.35 : id >= 21 ? 0.2 : 0;
  const dir = id >= 21 ? (rnd() < dirProb ? -1 : 1) : 1;

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

const out = resolve(__dirname, "../src/game/data/levels.generated.ts");
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
console.log(
  'Generated ' + levels.length + ' levels. speed ' + minSpeed + '-' + maxSpeed +
  ' deg/s. types: ' + JSON.stringify(typeCount) + '. wrote src/game/data/levels.generated.ts'
);
