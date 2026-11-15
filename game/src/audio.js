// Sound only: every effect is a small WebAudio synth, no audio files. The context is
// created lazily on the first user gesture (browsers block sound before one), and every call
// is guarded so a game with no audio device still plays silently.

export function createAudio() {
  let context = null;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, endFreq, duration, type, volume, delay) {
    const ctx = ensure();
    if (!ctx) return;
    try {
      const start = ctx.currentTime + (delay || 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (endFreq && endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Call from a user gesture so later sounds are allowed to play. */
    unlock() {
      ensure();
    },
    /** A rising ping; higher combos sing higher. */
    collect(combo) {
      const base = 520 + Math.min(combo, 24) * 22;
      tone(base, base * 1.5, 0.14, 'sine', 0.16);
      tone(base * 2, base * 2.4, 0.1, 'triangle', 0.06, 0.02);
    },
    hit() {
      tone(180, 55, 0.28, 'sawtooth', 0.22);
      tone(90, 40, 0.32, 'square', 0.12, 0.02);
    },
    dash() {
      tone(300, 900, 0.16, 'sine', 0.14);
    },
    power() {
      tone(440, 440, 0.1, 'triangle', 0.14);
      tone(660, 660, 0.1, 'triangle', 0.14, 0.09);
      tone(880, 880, 0.16, 'triangle', 0.14, 0.18);
    },
    wave() {
      tone(392, 392, 0.12, 'triangle', 0.12);
      tone(523, 523, 0.18, 'triangle', 0.12, 0.11);
    },
    over() {
      tone(392, 392, 0.22, 'triangle', 0.16);
      tone(311, 311, 0.22, 'triangle', 0.16, 0.2);
      tone(233, 180, 0.5, 'triangle', 0.16, 0.4);
    },
  };
}
