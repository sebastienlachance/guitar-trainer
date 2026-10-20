/** Samples of a plucked note, and the rate to play them at. */
export interface Pluck {
  /** Chosen so that one period of the note fits the delay line exactly: see `pluck()`. */
  readonly sampleRate: number;
  readonly samples: Float32Array<ArrayBuffer>;
}

/** Close to the usual output rate; each note's buffer rate is tuned from it. */
const BASE_RATE = 48_000;

/** How much of its energy the string keeps on each round trip: lower dies away sooner. */
const SUSTAIN = 0.996;

/** The end of a note fades out over this long, so it stops without a click. */
const FADE_S = 0.08;

/** Peak level of a note, leaving headroom when two overlap. */
const PEAK = 0.5;

/**
 * A plucked string, by the Karplus-Strong method: a burst of noise circulates in a delay line one
 * period long and is averaged a little on each pass, so the high harmonics die first, as on a
 * real string. `random` makes the burst; tests pass a seeded one.
 */
export function pluck(
  frequency: number,
  seconds: number,
  random: () => number = Math.random,
): Pluck {
  // Each pass averages a sample with the one after it, which shortens the loop by half a sample:
  // a line of N samples rings at a period of N - 0.5. Rounding N would leave high notes several
  // cents out of tune, so instead the buffer's sample rate is set to make N - 0.5 samples exactly
  // one period; the browser resamples it.
  const length = Math.max(2, Math.round(BASE_RATE / frequency + 0.5));
  const sampleRate = frequency * (length - 0.5);
  const line = noiseBurst(length, random);
  const samples = new Float32Array(Math.round(sampleRate * seconds));
  for (let index = 0; index < samples.length; index++) {
    const position = index % length;
    const value = line[position];
    samples[index] = value;
    line[position] = SUSTAIN * 0.5 * (value + line[(position + 1) % length]);
  }
  fadeOut(samples, Math.round(sampleRate * FADE_S));
  normalize(samples, PEAK);
  return { sampleRate, samples };
}

/** Noise without a constant offset, softened once so the pluck isn't harsh. */
function noiseBurst(length: number, random: () => number): Float32Array {
  const noise = Array.from({ length }, () => random() * 2 - 1);
  const softened = noise.map((value, index) => 0.5 * (value + noise[(index + 1) % length]));
  const mean = softened.reduce((sum, value) => sum + value, 0) / length;
  return Float32Array.from(softened, (value) => value - mean);
}

function fadeOut(samples: Float32Array, fadeLength: number): void {
  const from = Math.max(0, samples.length - fadeLength);
  for (let index = from; index < samples.length; index++) {
    samples[index] *= (samples.length - index) / (samples.length - from);
  }
}

function normalize(samples: Float32Array, peak: number): void {
  const loudest = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  if (loudest > 0) {
    samples.forEach((value, index) => (samples[index] = (value / loudest) * peak));
  }
}
