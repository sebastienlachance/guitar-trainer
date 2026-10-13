import { IntervalName, displayInterval } from './intervals';
import { commonNoteName, displayNoteName, mod, parseNote } from './notes';

/** How scales are grouped when you choose them. */
export type ScaleFamily = 'major-minor' | 'pentatonic' | 'mode';

/** The families in the order setup pages show them. */
export const SCALE_FAMILIES: readonly { readonly id: ScaleFamily; readonly label: string }[] = [
  { id: 'major-minor', label: 'Major and minor' },
  { id: 'pentatonic', label: 'Pentatonic and blues' },
  { id: 'mode', label: 'Modes' },
];

export interface ScaleType {
  /** Stable id used in storage keys, e.g. "minor-pentatonic". */
  readonly id: string;
  readonly name: string;
  readonly family: ScaleFamily;
  /** Scale degrees in ascending order from the root. */
  readonly intervals: readonly IntervalName[];
}

/** Scales the app knows; add a line here to offer another one. */
export const SCALE_TYPES: readonly ScaleType[] = [
  {
    id: 'major',
    name: 'Major',
    family: 'major-minor',
    intervals: ['1', '2', '3', '4', '5', '6', '7'],
  },
  {
    id: 'natural-minor',
    name: 'Natural minor',
    family: 'major-minor',
    intervals: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
  },
  {
    id: 'harmonic-minor',
    name: 'Harmonic minor',
    family: 'major-minor',
    intervals: ['1', '2', 'b3', '4', '5', 'b6', '7'],
  },
  {
    id: 'melodic-minor',
    name: 'Melodic minor',
    family: 'major-minor',
    intervals: ['1', '2', 'b3', '4', '5', '6', '7'],
  },
  {
    id: 'major-pentatonic',
    name: 'Major pentatonic',
    family: 'pentatonic',
    intervals: ['1', '2', '3', '5', '6'],
  },
  {
    id: 'minor-pentatonic',
    name: 'Minor pentatonic',
    family: 'pentatonic',
    intervals: ['1', 'b3', '4', '5', 'b7'],
  },
  {
    id: 'blues',
    name: 'Blues',
    family: 'pentatonic',
    intervals: ['1', 'b3', '4', 'b5', '5', 'b7'],
  },
  {
    id: 'dorian',
    name: 'Dorian',
    family: 'mode',
    intervals: ['1', '2', 'b3', '4', '5', '6', 'b7'],
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    family: 'mode',
    intervals: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
  },
  { id: 'lydian', name: 'Lydian', family: 'mode', intervals: ['1', '2', '3', '#4', '5', '6', '7'] },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    family: 'mode',
    intervals: ['1', '2', '3', '4', '5', '6', 'b7'],
  },
  {
    id: 'locrian',
    name: 'Locrian',
    family: 'mode',
    intervals: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
  },
];

export function scaleTypeById(id: string): ScaleType | undefined {
  return SCALE_TYPES.find((scale) => scale.id === id);
}

/** The name as it reads inside a sentence: "minor pentatonic", but "Dorian". */
export function scaleNameInText(scale: ScaleType): string {
  return scale.family === 'mode'
    ? scale.name
    : scale.name.charAt(0).toLowerCase() + scale.name.slice(1);
}

/** Roots as minor keys are usually written: C♯ and G♯, where major keys use D♭ and A♭. */
const MINOR_KEY_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

/** The root's name as the scale's key is usually written: A♭ major, but G♯ minor. */
export function scaleRootName(scale: ScaleType, rootPitchClass: number): string {
  return scale.intervals.includes('b3')
    ? displayNoteName(parseNote(MINOR_KEY_ROOTS[mod(rootPitchClass, 12)]))
    : commonNoteName(rootPitchClass);
}

/** The scale's degrees for display, e.g. "1 2 ♭3 4 5 6 ♭7". */
export function scaleFormula(scale: ScaleType): string {
  return scale.intervals.map(displayInterval).join(' ');
}
