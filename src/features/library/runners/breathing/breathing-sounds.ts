/**
 * Lightweight Web Audio API sound effects for the breathing runner.
 *
 * No external audio files needed — all sounds are synthesized in real-time.
 * Total footprint: ~0 KB (pure code, no assets).
 *
 * Sounds:
 *   - Bell: Tibetan singing bowl simulation (sine + harmonics with decay)
 *   - Breath guide: Soft noise burst shaped to inhale/exhale
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a gentle singing-bowl bell sound.
 * Duration: ~3 seconds with natural decay.
 */
export function playBell(volume = 0.25): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // Fundamental + two harmonics for richness
    const freqs = [528, 1056, 1584]; // C5 + octave + fifth
    const gains = [0.6, 0.25, 0.15];

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gains[i] * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 3);
    });
  } catch {
    // Silently fail — audio is decorative, never critical
  }
}

/**
 * Play a soft "whoosh" breath sound for inhale or exhale.
 * @param durationSec Length of the sound
 * @param type "inhale" ramps volume up, "exhale" ramps down
 */
export function playBreathSound(
  durationSec: number,
  type: "inhale" | "exhale",
  volume = 0.08,
): void {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // White noise via buffer
    const bufferSize = ctx.sampleRate * durationSec;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter for a breathy sound
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, now);
    filter.Q.setValueAtTime(0.5, now);

    const gain = ctx.createGain();
    if (type === "inhale") {
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + durationSec * 0.7);
      gain.gain.linearRampToValueAtTime(0.001, now + durationSec);
    } else {
      gain.gain.setValueAtTime(volume, now);
      gain.gain.linearRampToValueAtTime(0.001, now + durationSec);
    }

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + durationSec);
  } catch {
    // Silently fail
  }
}
