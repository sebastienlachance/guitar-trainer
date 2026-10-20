import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** interval: two notes; melody: a few notes of a scale. */
export type PhraseKind = 'interval' | 'melody';
export type Direction = 'up' | 'down' | 'both';
/** mic: the microphone checks what you play; self: reveal the phrase and judge yourself. */
export type AnswerMode = 'mic' | 'self';

export const PHRASE_KINDS: readonly PhraseKind[] = ['interval', 'melody'];
/** Interval ids, from `EAR_INTERVALS` in deck.ts. */
export const INTERVAL_IDS: readonly string[] = [
  'm2',
  'M2',
  'm3',
  'M3',
  'P4',
  'TT',
  'P5',
  'm6',
  'M6',
  'm7',
  'M7',
  'P8',
];
/** Scales melodies are made from, as `SCALE_TYPES` ids. */
export const MELODY_SCALE_IDS: readonly string[] = [
  'major-pentatonic',
  'minor-pentatonic',
  'major',
];
export const MELODY_LENGTHS: readonly number[] = [3, 4];

export interface PlaybackSettings {
  readonly kinds: readonly PhraseKind[];
  readonly intervals: readonly string[];
  readonly direction: Direction;
  readonly scales: readonly string[];
  /** Notes in a melody, the first one given. */
  readonly melodyLength: number;
  readonly answer: AnswerMode;
}

export const DEFAULT_SETTINGS: PlaybackSettings = {
  kinds: ['interval', 'melody'],
  intervals: ['M2', 'M3', 'P4', 'P5', 'P8'],
  direction: 'up',
  scales: ['major-pentatonic'],
  melodyLength: 3,
  answer: 'mic',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): PlaybackSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    kinds: pickList(raw['kinds'], PHRASE_KINDS, defaults.kinds),
    intervals: pickList(raw['intervals'], INTERVAL_IDS, defaults.intervals),
    direction: pickOne(raw['direction'], ['up', 'down', 'both'], defaults.direction),
    scales: pickList(raw['scales'], MELODY_SCALE_IDS, defaults.scales),
    melodyLength: pickOne(raw['melodyLength'], MELODY_LENGTHS, defaults.melodyLength),
    answer: pickOne(raw['answer'], ['mic', 'self'], defaults.answer),
  };
}
