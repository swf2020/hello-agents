/**
 * Web Audio API sound system.
 *
 * All sounds are synthesized using oscillators — no external audio files needed.
 * Must be initialised on a user gesture (browser autoplay policy).
 */

type SfxType = 'select' | 'confirm' | 'cancel' | 'hit' | 'heal' | 'catch' | 'levelUp';
type BgmType = 'title' | 'town' | 'battle' | 'victory';

class AudioSystem {
  private ctx: AudioContext | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmInterval: ReturnType<typeof setInterval> | null = null;
  private _bgmVolume = 0.5;
  private _sfxVolume = 0.7;
  private _isMuted = false;

  /* ──────────────────────── initialisation ──────────────────────── */

  /** Create (or resume) the AudioContext. Safe to call repeatedly. */
  init(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this._isMuted ? 0 : this._bgmVolume;
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this._isMuted ? 0 : this._sfxVolume;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /* ──────────────────────── helpers ──────────────────────── */

  private ensureInit(): void {
    if (!this.ctx) this.init();
  }

  private gain(volume = 1, dest?: AudioNode): GainNode {
    this.ensureInit();
    const g = this.ctx!.createGain();
    g.gain.value = volume;
    g.connect(dest ?? this.sfxGain!);
    return g;
  }

  private osc(
    freq: number,
    type: OscillatorType,
    dest: AudioNode,
    start = 0,
    duration: number,
  ): OscillatorNode {
    this.ensureInit();
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(dest);
    const now = this.ctx!.currentTime;
    o.start(now + start);
    o.stop(now + start + duration);
    return o;
  }

  private note(
    freq: number,
    type: OscillatorType,
    duration: number,
    delay = 0,
    volume = 0.3,
    dest?: AudioNode,
  ): void {
    const g = this.gain(volume, dest);
    this.osc(freq, type, g, delay, duration);
    // fade out at end to avoid click
    g.gain.setValueAtTime(volume, this.ctx!.currentTime + delay + duration - 0.02);
    g.gain.linearRampToValueAtTime(0, this.ctx!.currentTime + delay + duration);
  }

  /* ──────────────────────── SFX ──────────────────────── */

  playSfx(type: SfxType): void {
    if (this._isMuted) return;
    this.ensureInit();
    const dest = this.sfxGain!;

    switch (type) {
      case 'select':
        this.note(880, 'sine', 0.08, 0, 0.15, dest);
        break;

      case 'confirm':
        this.note(523, 'sine', 0.1, 0, 0.2, dest);
        this.note(659, 'sine', 0.12, 0.1, 0.2, dest);
        break;

      case 'cancel':
        this.note(659, 'sine', 0.1, 0, 0.2, dest);
        this.note(523, 'sine', 0.12, 0.1, 0.2, dest);
        break;

      case 'hit': {
        const g = this.gain(0.4, dest);
        this.osc(120, 'sawtooth', g, 0, 0.15);
        g.gain.setValueAtTime(0.4, this.ctx!.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.15);
        break;
      }

      case 'heal':
        this.note(523, 'sine', 0.12, 0, 0.2, dest);
        this.note(659, 'sine', 0.12, 0.1, 0.2, dest);
        this.note(784, 'sine', 0.15, 0.2, 0.2, dest);
        break;

      case 'catch': {
        // three wobbles + click
        const t = this.ctx!.currentTime;
        const w1 = this.ctx!.createOscillator();
        w1.type = 'triangle';
        w1.frequency.setValueAtTime(400, t);
        w1.frequency.linearRampToValueAtTime(200, t + 0.12);
        w1.frequency.linearRampToValueAtTime(400, t + 0.22);
        const g1 = this.gain(0.25, dest);
        w1.connect(g1);
        w1.start(t);
        w1.stop(t + 0.25);

        const w2 = this.ctx!.createOscillator();
        w2.type = 'triangle';
        w2.frequency.setValueAtTime(350, t + 0.3);
        w2.frequency.linearRampToValueAtTime(180, t + 0.4);
        w2.frequency.linearRampToValueAtTime(350, t + 0.48);
        const g2 = this.gain(0.25, dest);
        w2.connect(g2);
        w2.start(t + 0.3);
        w2.stop(t + 0.52);

        const w3 = this.ctx!.createOscillator();
        w3.type = 'triangle';
        w3.frequency.setValueAtTime(300, t + 0.58);
        w3.frequency.linearRampToValueAtTime(150, t + 0.68);
        w3.frequency.linearRampToValueAtTime(300, t + 0.75);
        const g3 = this.gain(0.25, dest);
        w3.connect(g3);
        w3.start(t + 0.58);
        w3.stop(t + 0.78);

        // final click
        this.note(1200, 'square', 0.04, 0.82, 0.12, dest);
        break;
      }

      case 'levelUp':
        this.note(523, 'square', 0.1, 0, 0.15, dest);
        this.note(587, 'square', 0.1, 0.12, 0.15, dest);
        this.note(659, 'square', 0.1, 0.24, 0.15, dest);
        this.note(784, 'square', 0.1, 0.36, 0.15, dest);
        this.note(1047, 'square', 0.25, 0.48, 0.2, dest);
        break;
    }
  }

  /* ──────────────────────── BGM ──────────────────────── */

  playBgm(type: BgmType): void {
    this.stopBgm();
    this.ensureInit();

    switch (type) {
      case 'title':
        this.startBgmLoop(this.titleMelody(), 4.0);
        break;
      case 'town':
        this.startBgmLoop(this.townMelody(), 3.2);
        break;
      case 'battle':
        this.startBgmLoop(this.battleMelody(), 2.4);
        break;
      case 'victory':
        this.playVictoryFanfare();
        break;
    }
  }

  stopBgm(): void {
    if (this.bgmInterval !== null) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    for (const o of this.bgmOscillators) {
      try { o.stop(); } catch { /* already stopped */ }
    }
    this.bgmOscillators = [];
  }

  /* ─── melody generators ─── */

  private titleMelody(): Array<{ freq: number; dur: number; delay: number }> {
    // C major arpeggio loop — calm, atmospheric
    const notes = [262, 330, 392, 523, 392, 330, 262, 196];
    const beat = 0.45;
    return notes.map((freq, i) => ({ freq, dur: beat * 0.9, delay: i * beat }));
  }

  private townMelody(): Array<{ freq: number; dur: number; delay: number }> {
    // Cheerful pentatonic melody
    const notes = [523, 587, 659, 784, 659, 587, 523, 440, 523, 659, 784, 880, 784, 659, 523, 587];
    const beat = 0.2;
    return notes.map((freq, i) => ({ freq, dur: beat * 0.85, delay: i * beat }));
  }

  private battleMelody(): Array<{ freq: number; dur: number; delay: number }> {
    // Fast, driving melody with some dissonance
    const notes = [
      440, 523, 440, 523, 587, 523, 440, 330,
      440, 523, 440, 523, 659, 587, 523, 440,
    ];
    const beat = 0.15;
    return notes.map((freq, i) => ({ freq, dur: beat * 0.8, delay: i * beat }));
  }

  private playVictoryFanfare(): void {
    // Play once — triumphant C major chord arpeggio
    const melody = [
      { freq: 523, dur: 0.15, delay: 0 },
      { freq: 659, dur: 0.15, delay: 0.15 },
      { freq: 784, dur: 0.15, delay: 0.3 },
      { freq: 1047, dur: 0.4, delay: 0.45 },
    ];
    const dest = this.bgmGain!;
    for (const n of melody) {
      this.note(n.freq, 'square', n.dur, n.delay, 0.15, dest);
    }
  }

  private startBgmLoop(
    melody: Array<{ freq: number; dur: number; delay: number }>,
    loopLength: number,
  ): void {
    const schedule = () => {
      const dest = this.bgmGain!;
      for (const n of melody) {
        this.note(n.freq, 'square', n.dur, n.delay, 0.12, dest);
      }
    };
    schedule();
    this.bgmInterval = setInterval(schedule, loopLength * 1000);
  }

  /* ──────────────────────── volume ──────────────────────── */

  setBgmVolume(vol: number): void {
    this._bgmVolume = vol;
    if (this.bgmGain) {
      this.bgmGain.gain.value = this._isMuted ? 0 : vol;
    }
  }

  setSfxVolume(vol: number): void {
    this._sfxVolume = vol;
    if (this.sfxGain) {
      this.sfxGain.gain.value = this._isMuted ? 0 : vol;
    }
  }

  setMuted(muted: boolean): void {
    this._isMuted = muted;
    if (this.bgmGain) {
      this.bgmGain.gain.value = muted ? 0 : this._bgmVolume;
    }
    if (this.sfxGain) {
      this.sfxGain.gain.value = muted ? 0 : this._sfxVolume;
    }
  }
}

export const audioSystem = new AudioSystem();
export type { SfxType, BgmType };
