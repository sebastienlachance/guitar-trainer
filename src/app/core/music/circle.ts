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

/** The pitch class one step round the circle from `pitchClass`. */
export function nextOnCircle(pitchClass: number, direction: CircleDirection): number {
  return mod(pitchClass + SEMITONES_PER_STEP[direction], 12);
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
