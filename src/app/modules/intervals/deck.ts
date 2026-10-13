import { FretPosition } from '../../core/fretboard/fretboard';
import {
  FrettedNote,
  POSITION_FRETS,
  findNotePositions,
  pitchClassAt,
  scaleInPosition,
} from '../../core/fretboard/placement';
import { STRING_NUMBERS } from '../../core/fretboard/tuning';
import {
  IntervalName,
  displayInterval,
  intervalFromSemitones,
  semitonesOf,
} from '../../core/music/intervals';
import { mod } from '../../core/music/notes';
import {
  SCALE_TYPES,
  ScaleType,
  scaleNameInText,
  scaleRootName,
  scaleTypeById,
} from '../../core/music/scales';
import { PracticeCard } from '../../core/practice/practice-run';
import { capitalize } from '../../core/ui/text';
import { IntervalTask, IntervalsSettings, ROOT_STRINGS, TASKS } from './settings';

/**
 * One interval of a scale shape, to find on the neck or to name. The card fixes the shape (the
 * scale, and the string its root is on); the root, and so the frets, change each time it comes
 * up, so stats follow the shape and you can't learn the answers by fret number.
 */
export interface IntervalCard extends PracticeCard {
  /** Identifies the card in stats: "find|minor-pentatonic|6|b3". */
  readonly key: string;
  readonly task: IntervalTask;
  readonly scale: ScaleType;
  /** String the position's root is on, under the second finger. */
  readonly rootString: number;
  /** The answer. Never the root, which is always shown. */
  readonly interval: IntervalName;
}

/** Where a card is asked this time it comes up. */
export interface IntervalQuestion {
  /** Pitch class of the root (C = 0). */
  readonly root: number;
  /** First fret of the hand position, which spans `start` to `start + 4`. */
  readonly start: number;
  /** The scale in the position, each pitch once. */
  readonly notes: readonly FrettedNote[];
  /** For Name questions, the note to name: one of the places the interval is in the shape. */
  readonly marked: FrettedNote;
}

/** A place that answers a Find question, with its exact pitch for the microphone. */
export interface Target extends FretPosition {
  readonly midi: number;
}

export function cardKey(
  task: IntervalTask,
  scale: ScaleType,
  rootString: number,
  interval: IntervalName,
): string {
  return `${task}|${scale.id}|${rootString}|${interval}`;
}

/** The intervals a scale's cards ask about: all but the root. */
export function askedIntervals(scale: ScaleType): IntervalName[] {
  return scale.intervals.filter((interval) => interval !== '1');
}

/** Every chosen task, for every chosen scale and root string, for each interval but the root. */
export function buildDeck(settings: IntervalsSettings): IntervalCard[] {
  const tasks = TASKS.filter((task) => settings.tasks.includes(task));
  const scales = SCALE_TYPES.filter((scale) => settings.scales.includes(scale.id));
  const rootStrings = ROOT_STRINGS.filter((string) => settings.rootStrings.includes(string));
  return tasks.flatMap((task) =>
    scales.flatMap((scale) =>
      rootStrings.flatMap((rootString) =>
        askedIntervals(scale).map((interval) => ({
          key: cardKey(task, scale, rootString, interval),
          task,
          scale,
          rootString,
          interval,
        })),
      ),
    ),
  );
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: IntervalsSettings): string[] {
  const problems: string[] = [];
  if (settings.tasks.length === 0) {
    problems.push('Pick Find, Name or both.');
  }
  if (settings.scales.length === 0) {
    problems.push('Pick at least one scale.');
  }
  if (settings.rootStrings.length === 0) {
    problems.push('Pick at least one string for the root.');
  }
  return problems;
}

/**
 * Frets the root can be at on its string. The root sits under the second finger, so the position
 * starts a fret lower and must end at or below `maxFret`. Fret 1 is left out: its position would
 * start at the nut, and open strings change the shape.
 */
export function rootFrets(maxFret: number): number[] {
  const frets: number[] = [];
  for (let fret = 2; fret - 1 + POSITION_FRETS <= maxFret; fret++) {
    frets.push(fret);
  }
  return frets;
}

/** Picks where to ask a card: a root that fits the fret range and, for Name, the note to mark. */
export function questionFor(
  card: IntervalCard,
  maxFret: number,
  random: () => number,
): IntervalQuestion {
  const frets = rootFrets(maxFret);
  const rootFret = frets[Math.floor(random() * frets.length)];
  const root = pitchClassAt({ string: card.rootString, fret: rootFret });
  const start = rootFret - 1;
  const notes = scaleInPosition(root, card.scale.intervals, start);
  // A position spans more than two octaves, so every interval is in it at least once.
  const places = notes.filter((note) => note.tone === card.interval);
  return { root, start, notes, marked: places[Math.floor(random() * places.length)] };
}

/**
 * Every place in the position that holds the card's interval, including other fingerings of
 * the same pitch: any of them answers a Find question.
 */
export function findTargets(card: IntervalCard, question: IntervalQuestion): Target[] {
  const pitchClass = mod(question.root + semitonesOf(card.interval), 12);
  return findNotePositions(pitchClass, STRING_NUMBERS, question.start + POSITION_FRETS).filter(
    (place) => place.fret >= question.start,
  );
}

/**
 * The interval from the root to any note: the scale's own spelling for its notes (Lydian's ♯4),
 * the usual one for the others.
 */
export function intervalAt(
  card: IntervalCard,
  question: IntervalQuestion,
  position: FretPosition,
): IntervalName {
  const semitones = mod(pitchClassAt(position) - question.root, 12);
  return (
    card.scale.intervals.find((interval) => semitonesOf(interval) === semitones) ??
    intervalFromSemitones(semitones)
  );
}

/** "G♯ minor pentatonic", "A♭ major". */
export function scaleLabel(card: IntervalCard, question: IntervalQuestion): string {
  return `${scaleRootName(card.scale, question.root)} ${scaleNameInText(card.scale)}`;
}

/** "♭3 in minor pentatonic" and "Find, root on string 6", for stats. */
export function describe(card: IntervalCard): { title: string; detail: string } {
  return {
    title: `${displayInterval(card.interval)} in ${scaleNameInText(card.scale)}`,
    detail: `${capitalize(card.task)}, root on string ${card.rootString}`,
  };
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): IntervalCard | undefined {
  const [task, scaleId, rootString, interval] = key.split('|');
  const scale = scaleTypeById(scaleId);
  const knownTask = TASKS.find((known) => known === task);
  const string = ROOT_STRINGS.find((known) => String(known) === rootString);
  const asked = scale && askedIntervals(scale).find((known) => known === interval);
  if (!scale || !knownTask || string === undefined || !asked) {
    return undefined;
  }
  return { key, task: knownTask, scale, rootString: string, interval: asked };
}
