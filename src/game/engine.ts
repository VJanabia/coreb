// CoreBall engine: pure canvas game logic (rotation, projectile, collision,
// attachment) with rendering. No framework, no assets - everything is drawn.
import { getLevel, totalPins, type Level } from "./levels";

export type GameState = "loading" | "ready" | "playing" | "success" | "failed" | "paused";

export interface HudInfo {
  level: number;
  ballsLeft: number;
  attached: number;
  total: number;
}

export interface EngineEvents {
  onStateChange: (state: GameState, level: number) => void;
  onHud: (hud: HudInfo) => void;
  onShoot: () => void;
  onAttach: () => void;
  onFail: () => void;
  onWin: () => void;
}

interface Pin {
  angle: number;
  color: string;
  pulse: number;
  bounce: number;
  hitFlash: number;
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number;
}

interface Projectile {
  active: boolean;
  x: number; y: number; color: string;
  phase: "windup" | "fly";
  phaseT: number;
}

// Visual proportions (kept in sync with scripts/generate-levels.mjs).
// The core is intentionally small; the pins are the visual focus.
const CORE_RATIO = 0.22;   // core radius relative to min(canvas w,h)
const SHAFT_RATIO = 0.6;   // shaft length relative to core radius
const HEAD_BASE = 0.135;
const HEAD_PER = 0.0016;
const HEAD_MIN = 0.08;
const MARGIN = 0.8;
const SHAFT_MARGIN = 1.25;
const WINDUP = 0.075;      // short pre-launch cue before the pin flies

const PIN_COLORS = [
  "#e5484d", "#f76b15", "#ffb224", "#46a758", "#12a594",
  "#0e8af0", "#7c66dc", "#e05299", "#5b6d96", "#c9a227",
];

export function pinColor(index: number): string {
  return PIN_COLORS[index % PIN_COLORS.length];
}

export class CoreballEngine {
  private ctx: CanvasRenderingContext2D | null = null;
  private events: EngineEvents | null = null;
  private raf = 0;
  private lastT = 0;

  state: GameState = 'loading';
  level: Level | null = null;
  private angle = 0;
  private speed = 0;
  private baseSpeed = 0;
  private dir: 1 | -1 = 1;
  private time = 0;
  private pins: Pin[] = [];
  private projectile: Projectile = { active: false, x: 0, y: 0, color: "#0e8af0", phase: "fly", phaseT: 0 };
  private particles: Particle[] = [];
  private shake = 0;
  private flash = 0;
  private coreFlash = 0;

  private shotsLeft = 0;
  private attached = 0;
  private total = 0;

  private dpr = 1;
  private w = 0; private h = 0; private cx = 0; private cy = 0;
  private R = 0; private shaftLen = 0; private headR = 0; private rh = 0;
  private projSpeed = 0; private readyOffset = 0;

  attach(canvas: HTMLCanvasElement, events: EngineEvents): void {
    this.ctx = canvas.getContext("2d");
    this.events = events;
    this.resize(canvas.clientWidth, canvas.clientHeight);
    this.state = "ready";
    this.emitState("ready");
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.ctx = null;
    this.events = null;
  }

  setDpr(dpr: number): void {
    this.dpr = Math.max(1, Math.min(2, dpr));
  }

  resize(w: number, h: number): void {
    this.w = w; this.h = h; this.cx = w / 2; this.cy = h / 2;
    this.R = Math.min(w, h) * CORE_RATIO;
    const scale = this.total > 0 ? headScale(this.total) : HEAD_BASE;
    this.headR = Math.max(5.5, this.R * scale);
    this.shaftLen = this.R * SHAFT_RATIO;
    this.rh = this.R + this.shaftLen;
    this.projSpeed = Math.max(w, h) * 1.5;
    this.readyOffset = Math.max(12, this.headR * 1.2);
  }

  startLevel(id: number): void {
    const lv = getLevel(id);
    this.level = lv;
    this.total = totalPins(lv);
    this.baseSpeed = (lv.speed * Math.PI) / 180;
    this.speed = this.baseSpeed;
    this.dir = lv.dir;
    this.angle = 0;
    this.shotsLeft = lv.shots;
    this.attached = lv.initial.length;
    this.pins = lv.initial.map((deg, i) => ({
      angle: (deg * Math.PI) / 180,
      color: pinColor(i),
      pulse: 0,
      bounce: 0,
      hitFlash: 0,
    }));
    this.projectile.active = false;
    this.particles = [];
    this.shake = 0;
    this.flash = 0;
    this.coreFlash = 0;
    this.resize(this.w, this.h);
    this.setState("playing");
    this.emitHud();
  }

  fire(): void {
    if (this.state !== "playing") return;
    if (this.projectile.active || this.shotsLeft <= 0) return;
    this.projectile.active = true;
    this.projectile.x = this.cx;
    this.projectile.y = this.h - this.readyOffset;
    this.projectile.color = pinColor(this.pins.length);
    this.projectile.phase = "windup";
    this.projectile.phaseT = 0;
    this.shotsLeft--;
    this.events?.onShoot();
    this.emitHud();
  }

  pause(): void {
    if (this.state === "playing") this.setState("paused");
  }

  resume(): void {
    if (this.state === "paused") this.setState("playing");
  }

  private setState(s: GameState): void {
    this.state = s;
    this.events?.onStateChange(s, this.level?.id ?? 1);
  }

  private emitState(s: GameState): void {
    this.events?.onStateChange(s, this.level?.id ?? 1);
  }

  private emitHud(): void {
    if (!this.level) return;
    this.events?.onHud({
      level: this.level.id,
      ballsLeft: this.shotsLeft,
      attached: this.attached,
      total: this.total,
    });
  }

  private loop = (t: number): void => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, Math.max(0.0001, (t - this.lastT) / 1000));
    this.lastT = t;
    this.update(dt);
    this.draw();
  };

  private update(dt: number): void {
    this.time += dt;
    if (this.state === "playing" || this.state === "ready") {
      const accel = this.level?.type === "accel" ? 1 + 0.025 * this.attached : 1;
      this.speed = this.baseSpeed * accel;
      this.angle += this.speed * this.dir * dt;
    } else {
      this.speed = 0;
    }

    for (const pin of this.pins) {
      pin.pulse = Math.max(0, pin.pulse - dt * 2.2);
      pin.bounce = Math.max(0, pin.bounce - dt * 6);
      pin.hitFlash = Math.max(0, pin.hitFlash - dt * 3);
    }
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    this.coreFlash = Math.max(0, this.coreFlash - dt * 2);

    if (this.projectile.active) {
      if (this.projectile.phase === "windup") {
        this.projectile.phaseT += dt;
        if (this.projectile.phaseT >= WINDUP) {
          this.projectile.phase = "fly";
          this.projectile.phaseT = 0;
        }
      } else {
        const sub = 4;
        for (let k = 0; k < sub; k++) {
          this.stepProjectile(dt / sub);
          if (!this.projectile.active) break;
        }
      }
    }

    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 260 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private stepProjectile(dt: number): void {
    const p = this.projectile;
    if (!p.active) return;
    const dx = this.cx - p.x;
    const dy = this.cy - p.y;
    const dist = Math.hypot(dx, dy);
    // attach when the pin's tip reaches the core surface (knob at radius rh)
    if (dist <= this.rh) {
      this.attachProjectile();
      return;
    }
    const step = this.projSpeed * dt;
    const move = Math.min(step, dist - this.rh);
    const nx = dx / dist;
    const ny = dy / dist;
    p.x += nx * move;
    p.y += ny * move;
    this.checkCollision();
  }

  // attach when the pin's tip reaches the core surface:
  // tip = knob + dirToCenter * shaftLen, so knob distance <= R + shaftLen
  private attachProjectile(): void {
    const p = this.projectile;
    const attachAngle = Math.atan2(p.y - this.cy, p.x - this.cx) - this.angle;
    this.pins.push({ angle: attachAngle, color: p.color, pulse: 1, bounce: 1, hitFlash: 0 });
    this.attached++;
    p.active = false;
    this.burst(p.x, p.y, p.color, 7, 90);
    this.events?.onAttach();
    this.emitHud();
    if (this.attached >= this.total) this.win();
  }

  private checkCollision(): void {
    const p = this.projectile;
    const threshold = this.headR * 2 * MARGIN;
    const shaftThreshold = this.headR * SHAFT_MARGIN;
    // direction from knob toward the center (tip direction)
    const dx = this.cx - p.x;
    const dy = this.cy - p.y;
    const dl = Math.hypot(dx, dy) || 1;
    const nx = dx / dl;
    const ny = dy / dl;
    const tipX = p.x + nx * this.shaftLen;
    const tipY = p.y + ny * this.shaftLen;
    for (const pin of this.pins) {
      const eff = pin.angle + this.angle;
      const hx = this.cx + Math.cos(eff) * this.rh;
      const hy = this.cy + Math.sin(eff) * this.rh;
      const ax = this.cx + Math.cos(eff) * this.R * 0.99;
      const ay = this.cy + Math.sin(eff) * this.R * 0.99;
      // knob vs pin head
      const dh = Math.hypot(p.x - hx, p.y - hy);
      if (dh < threshold) return this.fail(hx, hy, pin);
      // knob vs pin shaft
      if (distToSegment(p.x, p.y, ax, ay, hx, hy) < shaftThreshold) return this.fail(hx, hy, pin);
      // pin head vs projectile shaft (knob..tip)
      if (distToSegment(hx, hy, p.x, p.y, tipX, tipY) < shaftThreshold) return this.fail(hx, hy, pin);
      // tip vs pin shaft
      if (distToSegment(tipX, tipY, ax, ay, hx, hy) < shaftThreshold) return this.fail(hx, hy, pin);
    }
  }

  private fail(hx: number, hy: number, pin: Pin | null): void {
    if (this.state !== "playing") return;
    if (pin) pin.hitFlash = 1;
    this.projectile.active = false;
    this.shake = 1;
    this.flash = 0.85;
    this.coreFlash = 1;
    this.burst(hx, hy, "#e5484d", 14, 160);
    this.burst(this.projectile.x, this.projectile.y, "#e5484d", 8, 120);
    this.events?.onFail();
    this.setState("failed");
  }

  private win(): void {
    this.projectile.active = false;
    this.flash = 0;
    this.shake = 0;
    this.coreFlash = 1;
    const colors = [...PIN_COLORS, "#ffffff"];
    for (let i = 0; i < 44; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 220;
      this.particles.push({
        x: this.cx + Math.cos(a) * this.R * 0.6,
        y: this.cy + Math.sin(a) * this.R * 0.6,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 0.9 + Math.random() * 0.7,
        maxLife: 1.4,
        color: colors[i % colors.length],
        size: 2.5 + Math.random() * 3.5,
      });
    }
    this.events?.onWin();
    this.setState("success");
  }

  private burst(x: number, y: number, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.35,
        maxLife: 0.6,
        color,
        size: 1.8 + Math.random() * 2.4,
      });
    }
    if (this.particles.length > 120) this.particles.splice(0, this.particles.length - 120);
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const w = this.w; const h = this.h;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const shX = this.shake > 0 ? (Math.random() - 0.5) * 7 * this.shake : 0;
    const shY = this.shake > 0 ? (Math.random() - 0.5) * 7 * this.shake : 0;
    ctx.save();
    ctx.translate(this.cx + shX, this.cy + shY);

    // faint aiming ring + guide line for the waiting pin
    ctx.beginPath();
    ctx.setLineDash([4, 7]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(96,108,136,0.3)";
    ctx.arc(0, 0, this.rh, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // core
    const grad = ctx.createRadialGradient(
      -this.R * 0.35, -this.R * 0.4, this.R * 0.08, 0, 0, this.R * 1.02
    );
    grad.addColorStop(0, "#64779f");
    grad.addColorStop(0.45, "#41527a");
    grad.addColorStop(1, "#26314f");
    ctx.beginPath();
    ctx.arc(0, 0, this.R, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(20,28,48,0.35)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-this.R * 0.28, -this.R * 0.32, this.R * 0.14, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();

    // rotation direction marker (small chevron riding the core)
    this.drawDirectionMarker(ctx);

    // core flash ring (fail/win feedback)
    if (this.coreFlash > 0) {
      const ca = (this.coreFlash * 0.5).toFixed(3);
      ctx.beginPath();
      ctx.arc(0, 0, this.R * (1.15 + (1 - this.coreFlash) * 0.35), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255," + ca + ")";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // attached pins (pre-inserted + player shots, one unified system)
    for (const pin of this.pins) this.drawPin(ctx, pin);

    // ready pin (waiting below the core) or flying projectile
    if (!this.projectile.active && this.shotsLeft > 0 && (this.state === "playing" || this.state === "ready")) {
      this.drawReadyPin(ctx);
    } else if (this.projectile.active) {
      this.drawProjectile(ctx);
    }

    // particles
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x - this.cx - shX, p.y - this.cy - shY, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.flash > 0) {
      const flashAlpha = (this.flash * 0.28).toFixed(3);
      ctx.fillStyle = "rgba(229,72,77," + flashAlpha + ")";
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawPin(ctx: CanvasRenderingContext2D, pin: Pin): void {
    const eff = pin.angle + this.angle;
    const cdx = Math.cos(eff);
    const cdy = Math.sin(eff);
    // elastic settle after insertion (short bounce, then rest at rh)
    const settle = Math.sin((1 - pin.bounce) * Math.PI * 2) * 5 * pin.bounce;
    const headR = this.rh + settle;
    const headX = cdx * headR;
    const headY = cdy * headR;
    const inX = cdx * this.R * 0.99;
    const inY = cdy * this.R * 0.99;

    ctx.beginPath();
    ctx.moveTo(inX, inY);
    ctx.lineTo(headX - cdx * this.headR * 0.9, headY - cdy * this.headR * 0.9);
    ctx.lineWidth = Math.max(2, this.headR * 0.26);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#98a3ba";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(headX, headY, this.headR, 0, Math.PI * 2);
    ctx.fillStyle = pin.color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(20,28,48,0.25)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headX - this.headR * 0.3, headY - this.headR * 0.32, this.headR * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();

    if (pin.hitFlash > 0) {
      const ha = (pin.hitFlash * 0.85).toFixed(3);
      ctx.beginPath();
      ctx.arc(headX, headY, this.headR * 1.15, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255," + ha + ")";
      ctx.fill();
    }
    if (pin.pulse > 0) {
      const pulseAlpha = (0.55 * pin.pulse).toFixed(3);
      ctx.beginPath();
      ctx.arc(headX, headY, this.headR * (1 + 0.9 * (1 - pin.pulse)), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255," + pulseAlpha + ")";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private drawReadyPin(ctx: CanvasRenderingContext2D): void {
    const color = pinColor(this.pins.length);
    const y = this.h - this.readyOffset;
    // dashed shot-path guide from the pin tip to the core
    ctx.beginPath();
    ctx.setLineDash([5, 6]);
    ctx.moveTo(this.cx, y - this.shaftLen - 4);
    ctx.lineTo(this.cx, this.cy + this.R);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(96,108,136,0.35)";
    ctx.stroke();
    ctx.setLineDash([]);
    // gentle idle pulse so it reads as the next pin to shoot
    const pulse = 0.92 + 0.08 * Math.sin(this.time * 5);
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(this.cx, y - this.headR * 0.9);
    ctx.lineTo(this.cx, y - this.shaftLen);
    ctx.lineWidth = Math.max(2, this.headR * 0.26);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#98a3ba";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.cx, y, this.headR, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(20,28,48,0.25)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.cx - this.headR * 0.3, y - this.headR * 0.32, this.headR * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawProjectile(ctx: CanvasRenderingContext2D): void {
    const p = this.projectile;
    const dx = this.cx - p.x;
    const dy = this.cy - p.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    const windup = p.phase === "windup";
    const progress = windup ? p.phaseT / WINDUP : 1;
    const scale = windup ? 1 + 0.16 * Math.sin(progress * Math.PI) : 1;
    const tipX = p.x + nx * this.shaftLen;
    const tipY = p.y + ny * this.shaftLen;
    ctx.beginPath();
    ctx.moveTo(p.x + nx * this.headR * 0.9, p.y + ny * this.headR * 0.9);
    ctx.lineTo(tipX, tipY);
    ctx.lineWidth = Math.max(2, this.headR * 0.26);
    ctx.lineCap = "round";
    ctx.strokeStyle = "#98a3ba";
    ctx.stroke();
    if (windup) {
      const ringAlpha = (1 - progress) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.headR * (1.5 + 0.5 * progress), 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255," + ringAlpha.toFixed(3) + ")";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.headR * scale, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(20,28,48,0.25)";
    ctx.stroke();
  }

  private drawDirectionMarker(ctx: CanvasRenderingContext2D): void {
    // chevron at 3 o'clock on the core rim, pointing along the rotation
    const px = this.R * 0.62;
    const py = 0;
    ctx.beginPath();
    ctx.moveTo(px + 4, py);
    ctx.lineTo(px - 3, py - 5 * this.dir);
    ctx.lineTo(px - 3, py + 5 * this.dir);
    ctx.closePath();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
  }
}

function headScale(total: number): number {
  return Math.max(HEAD_MIN, HEAD_BASE - HEAD_PER * total);
}

function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  let t = len2 === 0 ? 0 : ((px - ax) * abx + (py - ay) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return Math.hypot(px - cx, py - cy);
}
