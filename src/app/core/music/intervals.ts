import { LETTERS, SpelledNote, mod, naturalPitchClass, pitchClassOf } from './notes';

export type IntervalName =
  '1' | 'b2' | '2' | 'b3' | '3' | '4' | '#4' | 'b5' | '5' | '#5' | 'b6' | '6' | 'bb7' | 'b7' | '7';

interface Interval {
  /** Scale degree: 3 for any kind of third. Decides the letter of the spelled note. */
  readonly degree: number;
  readonly semitones: number;
}

export const INTERVALS: Readonly<Record<IntervalName, Interval>> = {
  '1': { degree: 1, semitones: 0 },
  b2: { degree: 2, semitones: 1 },
  '2': { degree: 2, semitones: 2 },
  b3: { degree: 3, semitones: 3 },
  '3': { degree: 3, semitones: 4 },
  '4': { degree: 4, semitones: 5 },
  '#4': { degree: 4, semitones: 6 },
  b5: { degree: 5, semitones: 6 },
  '5': { degree: 5, semitones: 7 },
  '#5': { degree: 5, semitones: 8 },
  b6: { degree: 6, semitones: 8 },
  '6': { degree: 6, semitones: 9 },
  bb7: { degree: 7, semitones: 9 },
  b7: { degree: 7, semitones: 10 },
  '7': { degree: 7, semitones: 11 },
};

export function semitonesOf(interval: IntervalName): number {
  return INTERVALS[interval].semitones;
}

/**
 * Spells the note an interval above a root. The letter comes from the degree and the
 * accidental makes up the difference, which is why a diminished 7th above Eb is Dbb, not C.
 */
export function spellInterval(root: SpelledNote, interval: IntervalName): SpelledNote {
  const { degree, semitones } = INTERVALS[interval];
  const letter = LETTERS[(LETTERS.indexOf(root.letter) + degree - 1) % LETTERS.length];
  const targetPitchClass = pitchClassOf(root) + semitones;
  const accidental = mod(targetPitchClass - naturalPitchClass(letter) + 6, 12) - 6;
  return { letter, accidental };
}

/** Display form of an interval label, e.g. "b7" -> "♭7". */
export function displayInterval(interval: IntervalName): string {
  return interval.replaceAll('b', '♭').replaceAll('#', '♯');
}
