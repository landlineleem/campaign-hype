/**
 * report/sound.js — Web Audio API sound effects for Campaign Hype
 *
 * All sounds are synthesized — no audio files needed.
 * AudioContext is created on first user interaction or first play call.
 * Respects prefers-reduced-motion by silencing all output.
 */

let _ctx = null;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers require user gesture)
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Whoosh — played during map flyTo zoom
 * Filtered white noise sweep from low to high frequency
 */
export function playWhoosh() {
  if (isReducedMotion()) return;
  const ctx = getCtx();
  const duration = 2.5;
  const now = ctx.currentTime;

  // White noise buffer
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  // Bandpass filter sweeps up
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(3000, now + duration * 0.7);
  filter.frequency.exponentialRampToValueAtTime(800, now + duration);

  // Volume envelope
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.12, now + 0.3);
  gain.gain.setValueAtTime(0.12, now + duration * 0.6);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + duration);
}

/**
 * Ping — soft click/ping for dot cascade batches
 * Short sine tone with quick decay
 * @param {number} progress — 0 to 1, shifts pitch up as cascade progresses
 */
export function playPing(progress = 0) {
  if (isReducedMotion()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Pitch rises with progress: 800Hz → 1400Hz
  const freq = 800 + progress * 600;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.06);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.06, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.15);
}

/**
 * Rising tone — played during stat counter rollup
 * Continuous ascending tone that builds anticipation
 */
export function playRisingTone() {
  if (isReducedMotion()) return;
  const ctx = getCtx();
  const duration = 1.8;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + duration);

  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(450, now);
  osc2.frequency.exponentialRampToValueAtTime(1350, now + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.06, now + 0.3);
  gain.gain.setValueAtTime(0.06, now + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc2.start(now);
  osc.stop(now + duration);
  osc2.stop(now + duration);
}

/**
 * Chime — celebration chime for benchmark popup
 * Three-note ascending major chord
 */
export function playChime() {
  if (isReducedMotion()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — major triad
  const delays = [0, 0.12, 0.24];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + delays[i]);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + delays[i]);
    gain.gain.linearRampToValueAtTime(0.1, now + delays[i] + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delays[i] + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + delays[i]);
    osc.stop(now + delays[i] + 0.85);
  });
}

/**
 * Celebration fanfare — played on confetti burst
 * Quick ascending arpeggio with harmonics
 */
export function playCelebration() {
  if (isReducedMotion()) return;
  const ctx = getCtx();
  const now = ctx.currentTime;

  // Fast ascending arpeggio: C5 → E5 → G5 → C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const delays = [0, 0.08, 0.16, 0.24];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + delays[i]);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, now + delays[i]); // octave harmonic

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now + delays[i]);
    gain.gain.linearRampToValueAtTime(0.08, now + delays[i] + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + delays[i] + 0.6);

    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0, now + delays[i]);
    gain2.gain.linearRampToValueAtTime(0.03, now + delays[i] + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + delays[i] + 0.4);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);
    osc.start(now + delays[i]);
    osc2.start(now + delays[i]);
    osc.stop(now + delays[i] + 0.65);
    osc2.stop(now + delays[i] + 0.45);
  });

  // Sparkle — high-frequency shimmer overlay
  setTimeout(() => {
    const sparkleCtx = getCtx();
    const t = sparkleCtx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = sparkleCtx.createOscillator();
      osc.type = 'sine';
      const freq = 2000 + Math.random() * 2000;
      osc.frequency.setValueAtTime(freq, t + i * 0.1);

      const gain = sparkleCtx.createGain();
      gain.gain.setValueAtTime(0.02, t + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.2);

      osc.connect(gain);
      gain.connect(sparkleCtx.destination);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.25);
    }
  }, 300);
}
