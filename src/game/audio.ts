// Tiny WebAudio synth - all sound effects are generated, zero audio assets.
// Sound is OFF by default and only starts after the user enables it (no autoplay).
export class AudioSynth {
  private ctx: AudioContext | null = null;
  private _enabled = false;

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(on: boolean): void {
    this._enabled = on;
    if (on) this.ensureCtx();
  }

  private ensureCtx(): AudioContext | null {
    if (!this._enabled) return null;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(
    freq: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    delay = 0
  ): void {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(30, freq), t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + duration);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  shoot(): void {
    this.tone(700, 480, 0.07, "triangle", 0.06);
  }

  attach(): void {
    this.tone(1180, 900, 0.045, "sine", 0.09);
    this.tone(590, 520, 0.06, "triangle", 0.05);
  }

  fail(): void {
    this.tone(220, 80, 0.28, "sawtooth", 0.11);
    this.tone(160, 60, 0.34, "square", 0.06);
  }

  win(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => this.tone(n, n, 0.16, "triangle", 0.08, i * 0.09));
  }

  click(): void {
    this.tone(760, 640, 0.035, "sine", 0.05);
  }
}
