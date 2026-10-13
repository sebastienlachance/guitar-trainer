import { SCALE_TYPES } from '../../core/music/scales';
import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** find: tap the interval on the neck; name: name the interval of a marked note. */
export type IntervalTask = 'find' | 'name';
/** shape: the scale's other notes show faded around the roots; roots: only the roots show. */
export type NeckView = 'shape' | 'roots';
/** off: answer by tapping; play: the microphone also listens for Find questions. */
export type IntervalsMicMode = 'off' | 'play';

export const TASKS: readonly IntervalTask[] = ['find', 'name'];

/** Strings the position's root can be on, under the second finger. */
export const ROOT_STRINGS: readonly number[] = [6, 5];

export const MAX_FRET_CHOICES: readonly number[] = [12, 15];

export interface IntervalsSettings {
  readonly tasks: readonly IntervalTask[];
  /** Scale types to ask about, as ids such as "minor-pentatonic". */
  readonly scales: readonly string[];
  readonly rootStrings: readonly number[];
  readonly neck: NeckView;
  /** Highest fret a position may reach. */
  readonly maxFret: number;
  readonly micMode: IntervalsMicMode;
}

export const DEFAULT_SETTINGS: IntervalsSettings = {
  tasks: TASKS,
  scales: ['major', 'minor-pentatonic'],
  rootStrings: ROOT_STRINGS,
  neck: 'shape',
  maxFret: 12,
  micMode: 'off',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): IntervalsSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    tasks: pickList(raw['tasks'], TASKS, defaults.tasks),
    scales: pickList(
      raw['scales'],
      SCALE_TYPES.map((scale) => scale.id),
      defaults.scales,
    ),
    rootStrings: pickList(raw['rootStrings'], ROOT_STRINGS, defaults.rootStrings),
    neck: pickOne(raw['neck'], ['shape', 'roots'], defaults.neck),
    maxFret: pickOne(raw['maxFret'], MAX_FRET_CHOICES, defaults.maxFret),
    micMode: pickOne(raw['micMode'], ['off', 'play'], defaults.micMode),
  };
}
