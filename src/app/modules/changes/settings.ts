import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** mic: the microphone counts each change; tap: you press a key or a button for each. */
export type CountMode = 'mic' | 'tap';

/** Chords offered, as ids from `OPEN_CHORDS` in deck.ts. */
export const CHORD_IDS: readonly string[] = ['C', 'G', 'D', 'A', 'E', 'Am', 'Em', 'Dm', 'F'];
export const LENGTH_CHOICES: readonly number[] = [30, 60, 120];

export interface ChangesSettings {
  /** Every pair of these chords is a card. */
  readonly chords: readonly string[];
  /** Length of a take, in seconds. */
  readonly seconds: number;
  readonly count: CountMode;
}

export const DEFAULT_SETTINGS: ChangesSettings = {
  chords: ['C', 'G', 'D'],
  seconds: 60,
  count: 'mic',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): ChangesSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    chords: pickList(raw['chords'], CHORD_IDS, defaults.chords),
    seconds: pickOne(raw['seconds'], LENGTH_CHOICES, defaults.seconds),
    count: pickOne(raw['count'], ['mic', 'tap'], defaults.count),
  };
}
