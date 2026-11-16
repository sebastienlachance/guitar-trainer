import { displayNoteName, mod, parseNote } from './notes';

/** Which way round the circle: up a fourth each step (C, F, B♭…) or up a fifth (C, G, D…). */
export type CircleDirection = 'fourths' | 'fifths';

export const CIRCLE_DIRECTIONS: readonly CircleDirection[] = ['fourths', 'fifths'];

const SEMITONES_PER_STEP: Readonly<Record<CircleDirection, number>> = { fourths: 5, fifths: 7 };

/**
 * Each pitch class as it is usually recited round the circle: flats from F to G♭, then B, E, A,
 * D, G. So G♭ rather than F♯, and B rather than C♭. ASCII spellings, as in COMMON_NOTE_NAMES.
 */
const CIRCLE_SPELLINGS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A pitch class's name on the circle, e.g. 6 -> "Gb". */
export function circleNoteName(pitchClass: number): string {
  return CIRCLE_SPELLINGS[mod(pitchClass, 12)];
}

/** A pitch class as shown on the circle, e.g. 6 -> "G♭". */
export function circleNoteLabel(pitchClass: number): string {
  return displayNoteName(parseNote(circleNoteName(pitchClass)));
}

/** The pitch class a number of steps round the circle from `pitchClass`: one by default. */
export function nextOnCircle(pitchClass: number, direction: CircleDirection, steps = 1): number {
  return mod(pitchClass + steps * SEMITONES_PER_STEP[direction], 12);
}

/** Pitch classes round the circle in fourths from C: C F B♭ E♭ A♭ D♭ G♭ B E A D G. */
export const CIRCLE_OF_FOURTHS: readonly number[] = Array.from({ length: 12 }, (_, step) =>
  mod(step * SEMITONES_PER_STEP.fourths, 12),
);

/**
 * How many steps clockwise from C a pitch class sits on the usual drawing of the circle, with
 * fifths going clockwise: C 0, G 1, D 2 … F 11.
 */
export function clockPosition(pitchClass: number): number {
  return mod(pitchClass * SEMITONES_PER_STEP.fifths, 12);
}

/**
 * A major key's signature, as a count of sharps (positive) or flats (negative): A 3, E♭ -3. The
 * circle's spellings give the sharp keys up to B (5♯) and the flat keys down to G♭ (6♭).
 */
export function keySignature(majorKey: number): number {
  const position = clockPosition(majorKey);
  return position <= 5 ? position : position - 12;
}

/** Every signature the circle's keys use, from six flats to five sharps. */
export const KEY_SIGNATURES: readonly number[] = Array.from(
  { length: 12 },
  (_, index) => index - 6,
);

/** The major key with a signature: 3 -> A, -4 -> A♭. */
export function majorKeyWith(signature: number): number {
  return mod(signature * SEMITONES_PER_STEP.fifths, 12);
}

/** "No ♯ or ♭", "3♯", "4♭". */
export function signatureLabel(signature: number): string {
  if (signature === 0) {
    return 'No ♯ or ♭';
  }
  return signature > 0 ? `${signature}♯` : `${-signature}♭`;
}

/** A signature in words: "no sharps or flats", "1 sharp", "4 flats". */
export function signatureWords(signature: number): string {
  if (signature === 0) {
    return 'no sharps or flats';
  }
  const count = Math.abs(signature);
  const kind = signature > 0 ? 'sharp' : 'flat';
  return `${count} ${kind}${count === 1 ? '' : 's'}`;
}

/** The relative minor of a major key: the same notes, from the 6th degree. E♭ -> C. */
export function relativeMinor(majorKey: number): number {
  return mod(majorKey + 9, 12);
}

/**
 * The relative minors of the circle's keys, spelled from their signatures: G♯m (5♯) rather than
 * A♭m, E♭m (6♭) rather than D♯m.
 */
const MINOR_SPELLINGS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** A minor key's name, e.g. 8 -> "G♯m". */
export function minorKeyLabel(pitchClass: number): string {
  return displayNoteName(parseNote(MINOR_SPELLINGS[mod(pitchClass, 12)])) + 'm';
}
