import { Howl, Howler } from 'howler';

/**
 * GLOAMING sound — Howler playback fed by procedurally-synthesized WAV
 * data-URIs (no asset files, no network). Lazy-inits on first user gesture
 * (autoplay policy). Mute toggle persisted to localStorage.
 */

const SR = 22050;

function encodeWav(samples: Float32Array): string {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  view.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SR, true);
  view.setUint32(28, SR * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, 'data');
  view.setUint32(40, n * 2, true);
  let off = 44;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

const dur = (sec: number) => new Float32Array(Math.floor(SR * sec));
const sine = (t: number, f: number) => Math.sin(2 * Math.PI * f * t);

// soft UI tick
function synUi(): string {
  const s = dur(0.07);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    s[i] = sine(t, 660) * Math.exp(-t * 45) * 0.25;
  }
  return encodeWav(s);
}

// dice clatter — filtered noise bursts with a couple of bounces
function synDice(): string {
  const s = dur(0.42);
  let last = 0;
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const bounce = Math.exp(-t * 9) + 0.5 * Math.exp(-Math.abs(t - 0.16) * 40) + 0.4 * Math.exp(-Math.abs(t - 0.28) * 55);
    const noise = (Math.random() * 2 - 1);
    last = last * 0.6 + noise * 0.4; // low-pass for a woody rattle
    s[i] = last * bounce * 0.4;
  }
  return encodeWav(s);
}

// beacon — rising warm chord that blooms
function synBeacon(): string {
  const s = dur(0.9);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t * 8) * Math.exp(-t * 1.6);
    const sweep = 1 + t * 0.25;
    s[i] =
      (sine(t, 196 * sweep) * 0.5 + sine(t, 294 * sweep) * 0.35 + sine(t, 392 * sweep) * 0.25) *
      env *
      0.35;
  }
  return encodeWav(s);
}

// dread — low sub hit that drops
function synDread(): string {
  const s = dur(0.6);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const f = 84 - t * 30;
    s[i] = (sine(t, f) + 0.4 * sine(t, f * 0.5)) * Math.exp(-t * 3.5) * 0.5;
  }
  return encodeWav(s);
}

// dimmed — mournful descending tone
function synDimmed(): string {
  const s = dur(0.8);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const f = 330 - t * 140;
    s[i] = sine(t, f) * Math.exp(-t * 2.2) * 0.3;
  }
  return encodeWav(s);
}

// ambient — slow detuned low drone, seamless-ish loop
function synAmbient(): string {
  const s = dur(6);
  for (let i = 0; i < s.length; i++) {
    const t = i / SR;
    const lfo = 0.6 + 0.4 * sine(t, 0.07);
    s[i] =
      (sine(t, 55) * 0.5 + sine(t, 55.4) * 0.4 + sine(t, 82.5) * 0.25 + sine(t, 110) * 0.12) *
      lfo *
      0.12;
  }
  return encodeWav(s);
}

export type Sfx = 'ui' | 'dice' | 'beacon' | 'dread' | 'dimmed';

const MUTE_KEY = 'gloaming.muted';

class SoundManager {
  private sounds: Partial<Record<Sfx, Howl>> = {};
  private ambient: Howl | null = null;
  private ready = false;
  muted: boolean;

  constructor() {
    this.muted = localStorage.getItem(MUTE_KEY) === '1';
  }

  /** Build Howls once, on first user gesture. */
  init() {
    if (this.ready) return;
    this.ready = true;
    this.sounds = {
      ui: new Howl({ src: [synUi()], volume: 0.5 }),
      dice: new Howl({ src: [synDice()], volume: 0.7 }),
      beacon: new Howl({ src: [synBeacon()], volume: 0.8 }),
      dread: new Howl({ src: [synDread()], volume: 0.85 }),
      dimmed: new Howl({ src: [synDimmed()], volume: 0.7 }),
    };
    this.ambient = new Howl({ src: [synAmbient()], loop: true, volume: 0.0 });
    Howler.mute(this.muted);
    this.ambient.play();
    this.ambient.fade(0, 0.6, 2500);
  }

  play(s: Sfx) {
    if (!this.ready) return;
    this.sounds[s]?.play();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    Howler.mute(this.muted);
    return this.muted;
  }
}

export const sound = new SoundManager();
