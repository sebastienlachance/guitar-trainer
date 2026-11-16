import {
  CIRCLE_DIRECTIONS,
  CircleDirection,
  circleNoteLabel,
  circleNoteName,
  nextOnCircle,
} from '../../core/music/circle';
import { mod, parseNote, pitchClassOf } from '../../core/music/notes';
import { CardDescription } from '../../core/practice/drill';
import { PracticeCard } from '../../core/practice/practice-run';
import { CIRCLE_NOTE_NAMES, CircleSettings } from './settings';

/** "What comes after E♭, going round in fourths?" */
export interface CircleCard extends PracticeCard {
  /** Identifies the card in stats: "fourths|Eb". */
  readonly key: string;
  readonly direction: CircleDirection;
  /** The pitch class asked about (C = 0). */
  readonly from: number;
  /** The pitch class one step on: the answer. */
  readonly answer: number;
}

export function cardFor(direction: CircleDirection, from: number): CircleCard {
  return {
    key: `${direction}|${circleNoteName(from)}`,
    direction,
    from,
    answer: nextOnCircle(from, direction),
  };
}

/** Every chosen starting note, in each chosen direction. */
export function buildDeck(settings: CircleSettings): CircleCard[] {
  return settings.directions.flatMap((direction) =>
    settings.notes.map((name) => cardFor(direction, pitchClassOf(parseNote(name)))),
  );
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: CircleSettings): string[] {
  const problems: string[] = [];
  if (settings.directions.length === 0) {
    problems.push('Pick a direction: fourths, fifths or both.');
  }
  if (settings.notes.length === 0) {
    problems.push('Pick at least one note to start from.');
  }
  return problems;
}

/** Whether a played note answers the card: the right note in any octave. */
export function answersCard(card: CircleCard, midi: number): boolean {
  return mod(midi, 12) === card.answer;
}

/** The answer buttons: every note in pitch order, so a button's place gives nothing away. */
export const ANSWER_CHOICES: readonly number[] = Array.from({ length: 12 }, (_, pitch) => pitch);

/** "in fourths" or "in fifths". */
export function directionLabel(direction: CircleDirection): string {
  return `in ${direction}`;
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): CircleCard | undefined {
  const parts = key.split('|');
  const [direction, name] = parts;
  const known =
    parts.length === 2 &&
    CIRCLE_DIRECTIONS.includes(direction as CircleDirection) &&
    CIRCLE_NOTE_NAMES.includes(name);
  return known ? cardFor(direction as CircleDirection, pitchClassOf(parseNote(name))) : undefined;
}

/** "E♭ → A♭", in fourths: for the summary's slowest cards and the stats. */
export function describeCard(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card
    ? {
        title: `${circleNoteLabel(card.from)} → ${circleNoteLabel(card.answer)}`,
        detail: directionLabel(card.direction),
      }
    : undefined;
}
