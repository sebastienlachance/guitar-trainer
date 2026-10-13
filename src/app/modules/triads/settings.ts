import { STRING_SETS } from '../../core/fretboard/tuning';
import { pickList, pickNumber, pickOne, savedFields } from '../../core/practice/saved-settings';
import { CHORD_QUALITIES, ROOTS } from './catalog';

/** Ask for the chord only (any shape you like), or for a specific shape. */
export type PromptDetail = 'chord' | 'shape';
export type FourNoteVoicing = 'drop2' | 'shell' | 'both';
export type MicMode = 'off' | 'arpeggio' | 'strum';
export type LabelMode = 'interval' | 'note';

export interface TriadSettings {
  readonly qualities: readonly string[];
  readonly roots: readonly string[];
  readonly promptDetail: PromptDetail;
  readonly fourNoteVoicing: FourNoteVoicing;
  readonly stringSets: readonly string[];
  readonly inversions: readonly number[];
  readonly micMode: MicMode;
  /** How close a strum's spectrum must be to the chord to count (0 to 1). */
  readonly strumThreshold: number;
  readonly labelMode: LabelMode;
}

export const INVERSIONS: readonly number[] = [0, 1, 2, 3];

export const STRUM_THRESHOLD_RANGE = { min: 0.5, max: 0.95 } as const;

export const DEFAULT_SETTINGS: TriadSettings = {
  qualities: ['sus2', 'sus4'],
  roots: ROOTS,
  promptDetail: 'chord',
  fourNoteVoicing: 'both',
  stringSets: STRING_SETS.map((set) => set.id),
  inversions: INVERSIONS,
  micMode: 'off',
  strumThreshold: 0.8,
  labelMode: 'interval',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): TriadSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  const qualityIds = CHORD_QUALITIES.map((quality) => quality.id);
  return {
    qualities: pickList(raw['qualities'], qualityIds, defaults.qualities),
    roots: pickList(raw['roots'], ROOTS, defaults.roots),
    promptDetail: pickOne(raw['promptDetail'], ['chord', 'shape'], defaults.promptDetail),
    fourNoteVoicing: pickOne(
      raw['fourNoteVoicing'],
      ['drop2', 'shell', 'both'],
      defaults.fourNoteVoicing,
    ),
    stringSets: pickList(raw['stringSets'], defaults.stringSets, defaults.stringSets),
    inversions: pickList(raw['inversions'], INVERSIONS, defaults.inversions),
    micMode: pickOne(raw['micMode'], ['off', 'arpeggio', 'strum'], defaults.micMode),
    strumThreshold: pickNumber(
      raw['strumThreshold'],
      STRUM_THRESHOLD_RANGE.min,
      STRUM_THRESHOLD_RANGE.max,
      defaults.strumThreshold,
    ),
    labelMode: pickOne(raw['labelMode'], ['interval', 'note'], defaults.labelMode),
  };
}
