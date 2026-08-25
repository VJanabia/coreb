// Node simulation: verifies the phase-2 collision system against generated levels.
// For each sampled level: a perfectly centered shot into the widest gap must land,
// and a shot aimed at an occupied angle must fail.
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/game/data/levels.generated.ts", import.meta.url), "utf8");
const levels = JSON.parse(src.match(/export const LEVELS = (\[[\s\S]*\]);/)[1]);

// engine constants (keep in sync with src/game/engine.ts)
const SHAFT_RATIO = 0.6, HEAD_BASE = 0.135, HEAD_PER = 0.0016, HEAD_MIN = 0.08;
const MARGIN = 0.8, SHAFT_MARGIN = 1.25;

const headScale = (n) => Math.max(HEAD_MIN, HEAD_BASE - HEAD_PER * n);
const deg = (d) => (d * Math.PI) / 180;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
function distSeg(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const l2 = abx * abx + aby * aby;
  let t = l2 === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function simulate(level, fireDelay) {
  const R = 100;
  const total = level.ip.length + level.q;
  const headR = R * headScale(total);
  const shaftLen = R * SHAFT_RATIO;
  const rh = R + shaftLen;
  const threshold = headR * 2 * MARGIN;
  const shaftThreshold = headR * SHAFT_MARGIN;
  const speed = deg(level.sp) * level.d; // rad/s with direction
  const projSpeed = 300 * 1.5; // px/s (arbitrary canvas)
  const launchR = rh + headR + 14; // knob radius at fire
  const cx = 300, cy = 300;
  let angle = 0;
  const pins = level.ip.map((a) => deg(a));
  let phase = "windup", t = 0, windup = 0.075;
  let knobX = cx, knobY = cy + launchR;
  const dt = 1 / 240;
  let simT = 0;
  while (simT < fireDelay) { angle += speed * dt; simT += dt; }
  // windup then fly
  let safety = 0;
  while (phase !== "done" && safety++ < 200000) {
    angle += speed * dt;
    if (phase === "windup") { t += dt; if (t >= windup) phase = "fly"; simT += dt; continue; }
    const dx = cx - knobX, dy = cy - knobY;
    const d = Math.hypot(dx, dy);
    if (d <= rh) { phase = "done"; break; }
    const nx = dx / d, ny = dy / d;
    const step = Math.min(projSpeed * dt, d - rh);
    knobX += nx * step; knobY += ny * step;
    simT += dt;
    const tipX = knobX + nx * shaftLen, tipY = knobY + ny * shaftLen;
    for (const pa of pins) {
      const eff = pa + angle;
      const hx = cx + Math.cos(eff) * rh, hy = cy + Math.sin(eff) * rh;
      const ax = cx + Math.cos(eff) * R * 0.99, ay = cy + Math.sin(eff) * R * 0.99;
      if (dist(knobX, knobY, hx, hy) < threshold) return "fail-head";
      if (distSeg(knobX, knobY, ax, ay, hx, hy) < shaftThreshold) return "fail-shaft";
      if (distSeg(hx, hy, knobX, knobY, tipX, tipY) < shaftThreshold) return "fail-shaft2";
      if (distSeg(tipX, tipY, ax, ay, hx, hy) < shaftThreshold) return "fail-tip";
    }
  }
  return "ok";
}

// widest gap center (world angle at fire, atan2 with y-down: 0 = right, 90deg = bottom)
function widestGapCenter(level) {
  const sorted = level.ip.slice().sort((a, b) => a - b);
  const n = sorted.length;
  let best = 0, bestMid = 0;
  for (let i = 0; i < n; i++) {
    const next = sorted[(i + 1) % n] + (i === n - 1 ? 360 : 0);
    const g = next - sorted[i];
    if (g > best) { best = g; bestMid = (sorted[i] + next) / 2; }
  }
  return bestMid % 360;
}

function check(levelId) {
  const lv = levels[levelId - 1];
  const R = 100;
  const total = lv.ip.length + lv.q;
  const rh = R * (1 + SHAFT_RATIO);
  const launchR = rh + R * headScale(total) + 14;
  const projSpeed = 300 * 1.5;
  const flight = (launchR - rh) / projSpeed + 0.075; // windup + fly
  const speedRad = deg(lv.sp);
  const rotDuringFlight = speedRad * flight * (180 / Math.PI);
  const mid = widestGapCenter(lv);
  // fire so the gap center reaches bottom (90deg) at attach time
  const rotSigned = lv.d * rotDuringFlight; // signed rotation during flight
  const delayFor = (target) => ((((target - mid - rotSigned) / lv.d) % 360) + 360) % 360 / lv.sp;
  const fireDelay = delayFor(90);
  const result = simulate(lv, fireDelay);
  // also verify a shot aimed straight at an occupied pin fails
  const pinAngleWorld = (lv.ip[0] + 0) % 360;
  const fireDelayHit = ((((90 - pinAngleWorld - rotSigned) / lv.d) % 360) + 360) % 360 / lv.sp;
  const hitResult = simulate(lv, fireDelayHit);
  return { id: levelId, gapShot: result, aimedAtPin: hitResult };
}

const ids = [1, 2, 3, 5, 10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500];
let bad = 0;
for (const id of ids) {
  const r = check(id);
  const ok = r.gapShot === "ok" && r.aimedAtPin.startsWith("fail");
  if (!ok) bad++;
  console.log("L" + id + " gapShot=" + r.gapShot + " aimedAtPin=" + r.aimedAtPin + (ok ? " OK" : " *** PROBLEM"));
}
// sweep every level
let fails = [];
for (let id = 1; id <= 500; id++) {
  const r = check(id);
  if (r.gapShot !== "ok" || !r.aimedAtPin.startsWith("fail")) fails.push({ id, r });
}
console.log(fails.length === 0 ? "ALL 500 LEVELS PASS the collision simulation" : "FAILURES: " + JSON.stringify(fails.slice(0, 10)));
process.exitCode = fails.length ? 1 : 0;
