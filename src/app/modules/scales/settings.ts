import { SCALE_TYPES } from '../../core/music/scales';
import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

export interface ScalesSettings {
  /** Scale types to show and choose between, as ids such as "dorian". */
  readonly scales: readonly string[];
  /** Highest fret a position may reach. */
  readonly maxFret: number;
}

export const MAX_FRET_CHOICES: readonly number[] = [12, 15];

export const DEFAULT_SETTINGS: ScalesSettings = {
  scales: ['major', 'natural-minor', 'major-pentatonic', 'minor-pentatonic'],
  maxFret: 12,
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): ScalesSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    scales: pickList(
      raw['scales'],
      SCALE_TYPES.map((scale) => scale.id),
      defaults.scales,
    ),
    maxFret: pickOne(raw['maxFret'], MAX_FRET_CHOICES, defaults.maxFret),
  };
}
