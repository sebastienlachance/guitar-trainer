import {
  CIRCLE_DIRECTIONS,
  CIRCLE_OF_FOURTHS,
  CircleDirection,
  circleNoteName,
} from '../../core/music/circle';
import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** off: answer by tapping a name; play: the microphone also listens for the note. */
export type CircleMicMode = 'off' | 'play';

/** Every note, in the order of the circle in fourths: "C", "F", "Bb"… */
export const CIRCLE_NOTE_NAMES: readonly string[] = CIRCLE_OF_FOURTHS.map(circleNoteName);

export interface CircleSettings {
  /** Which ways round the circle to ask. */
  readonly directions: readonly CircleDirection[];
  /** The notes a question can start from, as names such as "Bb". */
  readonly notes: readonly string[];
  readonly micMode: CircleMicMode;
}

export const DEFAULT_SETTINGS: CircleSettings = {
  directions: ['fourths'],
  notes: CIRCLE_NOTE_NAMES,
  micMode: 'off',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): CircleSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    directions: pickList(raw['directions'], CIRCLE_DIRECTIONS, defaults.directions),
    notes: pickList(raw['notes'], CIRCLE_NOTE_NAMES, defaults.notes),
    micMode: pickOne(raw['micMode'], ['off', 'play'], defaults.micMode),
  };
}
