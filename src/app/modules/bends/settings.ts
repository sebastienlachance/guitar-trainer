import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** first: the target pitch plays before each bend; ask: only when you ask for it. */
export type TargetMode = 'first' | 'ask';

/** Strings bends are usually played on: the three highest, and the D string. */
export const BEND_STRINGS: readonly number[] = [1, 2, 3, 4];
/** Bend sizes in semitones: a half step, a whole step, a step and a half. */
export const BEND_SIZES: readonly number[] = [1, 2, 3];
/** Highest fret a bend starts on; the lowest is `MIN_START_FRET` in deck.ts. */
export const MAX_FRET_CHOICES: readonly number[] = [12, 17];

export interface BendsSettings {
  readonly strings: readonly number[];
  /** In semitones. */
  readonly sizes: readonly number[];
  readonly maxFret: number;
  readonly target: TargetMode;
}

export const DEFAULT_SETTINGS: BendsSettings = {
  strings: [1, 2, 3],
  sizes: [2],
  maxFret: 12,
  target: 'first',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): BendsSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    strings: pickList(raw['strings'], BEND_STRINGS, defaults.strings),
    sizes: pickList(raw['sizes'], BEND_SIZES, defaults.sizes),
    maxFret: pickOne(raw['maxFret'], MAX_FRET_CHOICES, defaults.maxFret),
    target: pickOne(raw['target'], ['first', 'ask'], defaults.target),
  };
}
