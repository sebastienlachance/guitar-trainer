import { STRING_NUMBERS } from '../../core/fretboard/tuning';
import { COMMON_NOTE_NAMES } from '../../core/music/notes';
import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** Find a note on one given string, or every place it appears on the chosen strings. */
export type PromptKind = 'string' | 'neck';
/** off: answer by tapping; play: the microphone also listens for the note (one-string prompts). */
export type NotesMicMode = 'off' | 'play';

export interface NotesSettings {
  /** Note names to ask for, e.g. "F#". */
  readonly notes: readonly string[];
  /** String numbers to ask about, 1 = high E. */
  readonly strings: readonly number[];
  /** Highest fret that counts; positions above it are out of the question. */
  readonly maxFret: number;
  readonly promptKind: PromptKind;
  readonly micMode: NotesMicMode;
}

export const MAX_FRET_CHOICES: readonly number[] = [5, 12, 15];

export const DEFAULT_SETTINGS: NotesSettings = {
  notes: COMMON_NOTE_NAMES,
  strings: STRING_NUMBERS,
  maxFret: 12,
  promptKind: 'string',
  micMode: 'off',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): NotesSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    notes: pickList(raw['notes'], COMMON_NOTE_NAMES, defaults.notes),
    strings: pickList(raw['strings'], STRING_NUMBERS, defaults.strings),
    maxFret: pickOne(raw['maxFret'], MAX_FRET_CHOICES, defaults.maxFret),
    promptKind: pickOne(raw['promptKind'], ['string', 'neck'], defaults.promptKind),
    micMode: pickOne(raw['micMode'], ['off', 'play'], defaults.micMode),
  };
}
