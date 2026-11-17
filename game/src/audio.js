// All sound is synthesized with WebAudio — no audio files, no network.
// The context starts on the first user gesture, so the page stays silent
// until the player clicks. M toggles mute.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch {
      // No audio device (headless, muted tab): the game plays silent.
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }

  tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Catch blip: pitch climbs with the combo so a streak feels like music.
  catchStar(kind, combo) {
    const base = kind === 'golden' ? 1046 : kind === 'bright' ? 784 : 523;
    const lift = Math.min(combo, 12) * 22;
    this.tone(base + lift, 0.1, 'triangle', 0.5);
    if (kind === 'golden') this.tone((base + lift) * 1.5, 0.14, 'sine', 0.35, 0.05);
  }

  forge() {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.4, i * 0.09));
    this.tone(2093, 0.7, 'sine', 0.18, 0.36);
  }

  lose() {
    this.tone(220, 0.28, 'sawtooth', 0.4, 0, 55);
    this.tone(110, 0.35, 'sine', 0.45, 0.02, 40);
  }

  win() {
    const scale = [523.25, 587.33, 659.25, 783.99, 1046.5, 1318.5];
    scale.forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.4, i * 0.11));
  }

  click() {
    this.tone(330, 0.07, 'square', 0.25);
  }

  wave() {
    this.tone(392, 0.16, 'sine', 0.3);
    this.tone(587.33, 0.22, 'sine', 0.3, 0.1);
  }
}
