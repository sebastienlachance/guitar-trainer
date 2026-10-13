import { mod } from '../music/notes';
import { chordSimilarity } from './chroma';

/** What the player must play for a prompt to count as heard. */
export type ChordTarget =
  /** A specific shape: the exact MIDI notes of each position it can be played in, low to high. */
  | { readonly kind: 'exact'; readonly positions: readonly (readonly number[])[] }
  /** Any voicing of the chord, in any octave. */
  | { readonly kind: 'pitchClasses'; readonly pitchClasses: readonly number[] };

export function targetPitchClasses(target: ChordTarget): number[] {
  return target.kind === 'pitchClasses'
    ? [...target.pitchClasses]
    : [...new Set(target.positions[0]?.map((midi) => mod(midi, 12)) ?? [])];
}

/**
 * True when the most recent notes, played one at a time, spell the target. A shape matches up or
 * down the strings; a chord-only target matches when the last notes cover each chord tone once.
 */
export function matchesArpeggio(heard: readonly number[], target: ChordTarget): boolean {
  if (target.kind === 'exact') {
    return target.positions.some((position) => {
      const recent = heard.slice(-position.length);
      return (
        recent.length === position.length &&
        (sameNotes(recent, position) || sameNotes([...recent].reverse(), position))
      );
    });
  }
  const wanted = new Set(target.pitchClasses);
  const recent = new Set(heard.slice(-wanted.size).map((midi) => mod(midi, 12)));
  return recent.size === wanted.size && [...wanted].every((pitchClass) => recent.has(pitchClass));
}

function sameNotes(a: readonly number[], b: readonly number[]): boolean {
  return a.every((midi, index) => midi === b[index]);
}

/** Each chord tone must carry at least this share of the loudest pitch class to count as present. */
export const MIN_TONE_ENERGY = 0.15;

/**
 * True when a strummed chord's spectrum is close enough to the chord. Checks the notes, not the
 * shape: overtones make the exact strings impossible to tell apart from a strum.
 */
export function matchesStrum(
  chroma: readonly number[],
  pitchClasses: readonly number[],
  threshold: number,
): boolean {
  const everyTonePresent = pitchClasses.every(
    (pitchClass) => chroma[pitchClass] >= MIN_TONE_ENERGY,
  );
  return everyTonePresent && chordSimilarity(chroma, pitchClasses) >= threshold;
}
