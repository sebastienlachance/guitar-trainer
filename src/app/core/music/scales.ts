import { IntervalName, displayInterval } from './intervals';

/** How scales are grouped when you choose them. */
export type ScaleFamily = 'major-minor' | 'pentatonic' | 'mode';

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

/** The scale's degrees for display, e.g. "1 2 ♭3 4 5 6 ♭7". */
export function scaleFormula(scale: ScaleType): string {
  return scale.intervals.map(displayInterval).join(' ');
}
