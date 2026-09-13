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
const SHAFT_RATIO = 0.72;      // shaft length relative to core radius (long, visible pins)
const HEAD_BASE = 0.135;       // pin head radius at small pin counts
const HEAD_PER = 0.0016;       // shrink per extra pin
const HEAD_MIN = 0.08;
const GAME_MARGIN = 0.8;       // game fails when head distance < 2*headR*MARGIN
const SHAFT_FACTOR = 1.0;      // pin head vs projectile shaft threshold, in headR units
const FLIGHT_SECONDS = 0.05;   // projectile fly time incl. margin (windup excluded: no collision there)
const MARGIN_DEG = 2;          // extra gap budget so the timing window stays humane

const headScale = (total) => Math.max(HEAD_MIN, HEAD_BASE - HEAD_PER * total);
const rhRatio = (total) => 1 + SHAFT_RATIO + headScale(total);
// The minimum gap a player can pass, including how far the core rotates while
// the pin flies. Combines the head-head clearance at the ring and the
// shaft-clearance sweep during flight.
const minGapDeg = (total, spDeg = 0) => {
  const hh = Math.asin(Math.min(0.999, (headScale(total) * 2 * GAME_MARGIN) / rhRatio(total)));
  const headHeadGap = 2 * ((hh * 180) / Math.PI);
  const shaftArc = Math.asin(Math.min(0.999, (headScale(total) * SHAFT_FACTOR) / rhRatio(total)));
  const sweepGap = 2 * (((shaftArc * 180) / Math.PI) + spDeg * FLIGHT_SECONDS);
  return Math.max(headHeadGap, sweepGap) + MARGIN_DEG;
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
// initial pins: 2..15 pre-inserted pins, HARD cap at 15.
// Most levels sit in the 3..12 range; only the hardest ones approach 15.
function initialPinsFor(id) {
  let n;
  if (id <= 10) n = 2 + Math.floor((id - 1) / 2);           // 2..6
  else if (id <= 30) n = 4 + Math.floor((id - 11) / 4);     // 4..8
  else if (id <= 60) n = 6 + Math.floor((id - 31) / 6);     // 6..10
  else if (id <= 100) n = 8 + Math.floor((id - 61) / 9);    // 8..12
  else if (id <= 200) n = 10 + Math.floor((id - 101) / 25); // 10..13
  else if (id <= 350) n = 12 + (id % 5 === 0 ? 1 : 0);      // 12..13
  else n = 14 + (id % 3 === 0 ? 1 : 0);                     // 14..15
  return Math.min(15, n);
}

// total pins on the finished core (initial + shots); capped at 30 so the
// finished ring never looks overcrowded and gaps always stay fair.
function totalTarget(id) {
  return Math.min(8 + Math.floor((id - 1) * 1.1), 30);
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
  if (id <= 10) return 24 + (id - 1) * 1.6;        // 24..38
  if (id <= 30) return 40 + (id - 11) * 0.6;       // 40..51
  if (id <= 60) return 52 + (id - 31) * 0.28;      // 52..60
  if (id <= 100) return 61 + (id - 61) * 0.12;     // 61..66
  if (id <= 200) return 66 + (id - 101) * 0.06;    // 66..72
  if (id <= 350) return 72 + (id - 201) * 0.04;    // 72..78
  return 78 + (id - 351) * 0.04;                   // 78..84
}

const TYPE_SPEED = {
  normal: 1, fast: 1.08, slow: 0.85, accel: 0.94,
  mirror: 1, dense: 1.03, cluster: 1.0, narrow: 0.95,
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

// ---------------------------------------------------------------- initial-pin shapes
// Each level gets a distinct, fixed, reproducible arrangement of its initial pins:
// even spread / dense block at top/bottom/left/right / two opposite blocks /
// irregular scatter / one dense side + spread. Cluster and narrow types keep
// their special rules (dense zone stays pre-inserted; narrow gap stays open).
function pickInitialIndices(total, initial, type, rnd, narrowGapIdx, clusterCount) {
  if (type === 'cluster' && clusterCount > 0) {
    const take = Math.min(initial, clusterCount);
    const out = Array.from({ length: take }, (_, i) => i);
    const seen = new Set(out);
    for (let i = total - 1; i >= 0 && out.length < initial; i--) {
      if (!seen.has(i)) {
        seen.add(i);
        out.push(i);
      }
    }
    return out;
  }
  if (type === 'narrow' && typeof narrowGapIdx === 'number') {
    const start = (narrowGapIdx + 1) % total;
    return Array.from({ length: initial }, (_, i) => (start + i) % total);
  }
  const shapes = ['block', 'even', 'block', 'twoBlocks', 'irregular', 'block', 'denseSide', 'even'];
  const shape = shapes[Math.floor(rnd() * shapes.length)];
  const step = 360 / total;
  let out = [];
  switch (shape) {
    case 'block': {
      const regions = [0, 90, 180, 270];
      const center = regions[Math.floor(rnd() * regions.length)];
      const span = (initial - 1) * step;
      const startAngle = ((center - span / 2) % 360 + 360) % 360;
      const startIdx = Math.round(startAngle / step) % total;
      out = Array.from({ length: initial }, (_, i) => (startIdx + i) % total);
      break;
    }
    case 'even': {
      const off = Math.floor(rnd() * total);
      out = Array.from({ length: initial }, (_, i) => (off + Math.round((i * total) / initial)) % total);
      break;
    }
    case 'twoBlocks': {
      const s1 = Math.ceil(initial / 2);
      const s2 = initial - s1;
      const start = Math.floor(rnd() * total);
      out = Array.from({ length: s1 }, (_, i) => (start + i) % total);
      const start2 = (start + Math.floor(total / 2)) % total;
      for (let i = 0; i < s2; i++) out.push((start2 + i) % total);
      break;
    }
    case 'irregular': {
      const idx = Array.from({ length: total }, (_, i) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      out = idx.slice(0, initial);
      break;
    }
    case 'denseSide': {
      const dense = Math.max(2, Math.ceil(initial * 0.6));
      const start = Math.floor(rnd() * total);
      out = Array.from({ length: dense }, (_, i) => (start + i) % total);
      const rest = initial - dense;
      const spread = Math.max(1, Math.floor(total / Math.max(1, rest)));
      const off = Math.floor(rnd() * total);
      for (let i = 0; i < rest; i++) out.push((off + i * spread) % total);
      break;
    }
  }
  const seen = new Set();
  const unique = [];
  for (const i of out) {
    if (!seen.has(i)) {
      seen.add(i);
      unique.push(i);
    }
  }
  for (let i = 0; i < total && unique.length < initial; i++) {
    if (!seen.has(i)) {
      seen.add(i);
      unique.push(i);
    }
  }
  return unique.slice(0, initial);
}

// ---------------------------------------------------------------- level builder
function buildLevel(id) {
  const rnd = mulberry32(id * 2654435761 + 1013904223);
  const type = typeFor(id, rnd);
  const initial = initialPinsFor(id);
  let sp = Math.round(baseSpeed(id) * TYPE_SPEED[type] * 100) / 100;
  // choose the largest total whose base gap can fit the sweep-aware requirement
  let total = Math.min(totalTarget(id), 30);
  while (total > initial + 4 && minGapDeg(total, sp) > 360 / total) total--;
  // safety: if even the floor is too tight, ease the speed down
  while (sp > 20 && minGapDeg(total, sp) > 360 / total) {
    sp = Math.round(sp * 0.95 * 100) / 100;
  }
  const shots = total - initial;
  const needGap = minGapDeg(total, sp);

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

  // deterministic pick of the pre-inserted pins (one of several fixed shapes)
  const ipIdx = pickInitialIndices(total, initial, type, rnd, layout.narrowGapIdx, layout.clusterCount);
  const ip = ipIdx.map((i) => angles[i]).sort((a, b) => a - b);
  if (ip.length !== initial) {
    throw new Error("level " + id + ": initial pick size " + ip.length + " != " + initial);
  }

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
