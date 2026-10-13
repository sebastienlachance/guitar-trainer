import { STRING_NUMBERS } from '../../core/fretboard/tuning';
import { COMMON_NOTE_NAMES } from '../../core/music/notes';
import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** How many names to choose from: 4 (the right one and three others) or all 12. */
export type ChoiceCount = 4 | 12;

export interface IdentifySettings {
  /** Notes that can be asked about, as names such as "F#". */
  readonly notes: readonly string[];
  /** String numbers to ask about, 1 = high E. */
  readonly strings: readonly number[];
  /** Highest fret a question can point at. */
  readonly maxFret: number;
  readonly choices: ChoiceCount;
}

export const MAX_FRET_CHOICES: readonly number[] = [5, 12, 15];

export const CHOICE_COUNTS: readonly ChoiceCount[] = [4, 12];

export const DEFAULT_SETTINGS: IdentifySettings = {
  notes: COMMON_NOTE_NAMES,
  strings: STRING_NUMBERS,
  maxFret: 12,
  choices: 4,
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): IdentifySettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    notes: pickList(raw['notes'], COMMON_NOTE_NAMES, defaults.notes),
    strings: pickList(raw['strings'], STRING_NUMBERS, defaults.strings),
    maxFret: pickOne(raw['maxFret'], MAX_FRET_CHOICES, defaults.maxFret),
    choices: pickOne(raw['choices'], CHOICE_COUNTS, defaults.choices),
  };
}
