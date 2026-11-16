import {
  CIRCLE_DIRECTIONS,
  CIRCLE_OF_FOURTHS,
  CircleDirection,
  circleNoteName,
} from '../../core/music/circle';
import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/**
 * next: name the next note round the circle; keys: key signatures and relative minors; neck: a
 * note on the fretboard, and you find the next one round.
 */
export type CircleExercise = 'next' | 'keys' | 'neck';

/** random: cards come up favouring the slow ones; laps: each answer is the next question. */
export type CircleOrder = 'random' | 'laps';

/**
 * signature: how many sharps or flats a major key has; key: which major key has a signature;
 * relative: a major key's relative minor.
 */
export type KeyQuestion = 'signature' | 'key' | 'relative';

/** off: answer by tapping; play: the microphone also listens for the note. */
export type CircleMicMode = 'off' | 'play';

export const CIRCLE_EXERCISES: readonly CircleExercise[] = ['next', 'keys', 'neck'];
export const KEY_QUESTIONS: readonly KeyQuestion[] = ['signature', 'key', 'relative'];
/** How far round a Next note question can jump. */
export const STEP_CHOICES: readonly number[] = [1, 2, 3];

/** Every note, in the order of the circle in fourths: "C", "F", "Bb"… */
export const CIRCLE_NOTE_NAMES: readonly string[] = CIRCLE_OF_FOURTHS.map(circleNoteName);

export interface CircleSettings {
  readonly exercise: CircleExercise;
  /** Which ways round the circle to ask, in Next note and On the neck. */
  readonly directions: readonly CircleDirection[];
  /** How many steps round a Next note question asks, in random order. */
  readonly steps: readonly number[];
  /** Random cards or laps, in Next note. */
  readonly order: CircleOrder;
  readonly keyQuestions: readonly KeyQuestion[];
  /** The notes a question (or a lap) starts from, or the keys asked about, as names like "Bb". */
  readonly notes: readonly string[];
  readonly micMode: CircleMicMode;
}

export const DEFAULT_SETTINGS: CircleSettings = {
  exercise: 'next',
  directions: ['fourths'],
  steps: [1],
  order: 'random',
  keyQuestions: KEY_QUESTIONS,
  notes: CIRCLE_NOTE_NAMES,
  micMode: 'off',
};

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): CircleSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  return {
    exercise: pickOne(raw['exercise'], CIRCLE_EXERCISES, defaults.exercise),
    directions: pickList(raw['directions'], CIRCLE_DIRECTIONS, defaults.directions),
    steps: pickList(raw['steps'], STEP_CHOICES, defaults.steps),
    order: pickOne(raw['order'], ['random', 'laps'], defaults.order),
    keyQuestions: pickList(raw['keyQuestions'], KEY_QUESTIONS, defaults.keyQuestions),
    notes: pickList(raw['notes'], CIRCLE_NOTE_NAMES, defaults.notes),
    micMode: pickOne(raw['micMode'], ['off', 'play'], defaults.micMode),
  };
}
