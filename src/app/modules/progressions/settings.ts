import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** sound: a tick and the light; light: the light only. */
export type ClickMode = 'sound' | 'light';

/** Ready-made progressions, by key: their chord ids joined by dashes (see `PRESETS`). */
export const PRESET_KEYS: readonly string[] = [
  'G-D-Em-C',
  'C-G-Am-F',
  'Am-F-C-G',
  'A-D-E-A',
  'D-A-Bm-G',
];
export const BEATS_PER_CHORD_CHOICES: readonly number[] = [2, 4];
export const START_TEMPO_CHOICES: readonly number[] = [60, 70, 80, 90];

export interface ProgressionsSettings {
  readonly presets: readonly string[];
  /** Your own progression, as typed: chord symbols separated by spaces. */
  readonly custom: string;
  readonly beatsPerChord: number;
  /** Tempo a progression starts at, before its ladder moves it. */
  readonly startTempo: number;
  readonly click: ClickMode;
}

export const DEFAULT_SETTINGS: ProgressionsSettings = {
  presets: ['G-D-Em-C'],
  custom: '',
  beatsPerChord: 4,
  startTempo: 70,
  click: 'sound',
};

/** Longest custom progression kept, in characters: far more than eight chords need. */
const CUSTOM_MAX_LENGTH = 80;

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): ProgressionsSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  const custom = raw['custom'];
  return {
    presets: pickList(raw['presets'], PRESET_KEYS, defaults.presets),
    custom: typeof custom === 'string' ? custom.slice(0, CUSTOM_MAX_LENGTH) : defaults.custom,
    beatsPerChord: pickOne(raw['beatsPerChord'], BEATS_PER_CHORD_CHOICES, defaults.beatsPerChord),
    startTempo: pickOne(raw['startTempo'], START_TEMPO_CHOICES, defaults.startTempo),
    click: pickOne(raw['click'], ['sound', 'light'], defaults.click),
  };
}
