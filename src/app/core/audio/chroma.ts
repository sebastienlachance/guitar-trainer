import { mod } from '../music/notes';

/** Band that holds guitar fundamentals and their strongest overtones. */
const MIN_HZ = 75;
const MAX_HZ = 1300;

/**
 * Folds a spectrum into 12 pitch classes (C = 0) and scales it so the loudest is 1.
 * `decibels` is what AnalyserNode.getFloatFrequencyData produces.
 */
export function chromaFromSpectrum(decibels: Float32Array, sampleRate: number): number[] {
  const chroma = new Array<number>(12).fill(0);
  const binHz = sampleRate / (decibels.length * 2);
  const first = Math.max(1, Math.ceil(MIN_HZ / binHz));
  const last = Math.min(decibels.length - 1, Math.floor(MAX_HZ / binHz));
  for (let bin = first; bin <= last; bin++) {
    const amplitude = 10 ** (decibels[bin] / 20);
    const midi = 69 + 12 * Math.log2((bin * binHz) / 440);
    chroma[mod(Math.round(midi), 12)] += amplitude * amplitude;
  }
  const loudest = Math.max(...chroma);
  return loudest > 0 ? chroma.map((energy) => energy / loudest) : chroma;
}

/** Cosine similarity between a chroma vector and the chord's pitch classes (0 to 1). */
export function chordSimilarity(
  chroma: readonly number[],
  pitchClasses: readonly number[],
): number {
  const template = new Set(pitchClasses);
  let dot = 0;
  let norm = 0;
  chroma.forEach((energy, pitchClass) => {
    if (template.has(pitchClass)) {
      dot += energy;
    }
    norm += energy * energy;
  });
  return norm === 0 ? 0 : dot / Math.sqrt(norm * template.size);
}
