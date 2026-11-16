import { FretPosition } from '../../core/fretboard/fretboard';
import { findNotePositions } from '../../core/fretboard/placement';
import {
  CIRCLE_DIRECTIONS,
  CIRCLE_OF_FOURTHS,
  CircleDirection,
  KEY_SIGNATURES,
  circleNoteLabel,
  circleNoteName,
  keySignature,
  minorKeyLabel,
  nextOnCircle,
  relativeMinor,
  signatureLabel,
} from '../../core/music/circle';
import { mod, parseNote, pitchClassOf } from '../../core/music/notes';
import { CardDescription } from '../../core/practice/drill';
import { PracticeCard } from '../../core/practice/practice-run';
import {
  CIRCLE_NOTE_NAMES,
  CircleSettings,
  KEY_QUESTIONS,
  KeyQuestion,
  STEP_CHOICES,
} from './settings';

/** "What comes after E♭, in fourths?", answered by name (next) or on the fretboard (neck). */
export interface StepCard extends PracticeCard {
  /** Identifies the card in stats: "fourths|Eb", "fourths|Eb|2", "neck|fourths|Eb". */
  readonly key: string;
  readonly kind: 'next' | 'neck';
  readonly direction: CircleDirection;
  /** How far round: 1 for the next note. */
  readonly steps: number;
  /** The pitch class asked about (C = 0). */
  readonly from: number;
  readonly answer: number;
}

/** A question about a major key: its signature, the key with a signature, its relative minor. */
export interface KeyCard extends PracticeCard {
  /** Identifies the card in stats: "signature|Eb", "key|Eb", "relative|Eb". */
  readonly key: string;
  readonly kind: KeyQuestion;
  /** The major key the question is about. */
  readonly major: number;
  /** A signature (signature), the key itself (key) or its relative minor (relative). */
  readonly answer: number;
}

export type CircleCard = StepCard | KeyCard;

export function isStepCard(card: CircleCard): card is StepCard {
  return card.kind === 'next' || card.kind === 'neck';
}

export const DIRECTION_LABELS: Readonly<Record<CircleDirection, string>> = {
  fourths: 'Fourths',
  fifths: 'Fifths',
};

export const KEY_QUESTION_LABELS: Readonly<Record<KeyQuestion, string>> = {
  signature: 'Key signature',
  key: 'Key from signature',
  relative: 'Relative minor',
};

const pitchClassOfName = (name: string) => pitchClassOf(parseNote(name));

export function stepCard(
  kind: StepCard['kind'],
  direction: CircleDirection,
  from: number,
  steps = 1,
): StepCard {
  const name = circleNoteName(from);
  const key =
    kind === 'neck'
      ? `neck|${direction}|${name}`
      : `${direction}|${name}` + (steps === 1 ? '' : `|${steps}`);
  return { key, kind, direction, steps, from, answer: nextOnCircle(from, direction, steps) };
}

const KEY_ANSWERS: Readonly<Record<KeyQuestion, (major: number) => number>> = {
  signature: keySignature,
  key: (major) => major,
  relative: relativeMinor,
};

export function keyCard(kind: KeyQuestion, major: number): KeyCard {
  return { key: `${kind}|${circleNoteName(major)}`, kind, major, answer: KEY_ANSWERS[kind](major) };
}

/** The cards of the chosen exercise. */
export function buildDeck(settings: CircleSettings): CircleCard[] {
  const notes = settings.notes.map(pitchClassOfName);
  const { directions } = settings;
  switch (settings.exercise) {
    case 'keys':
      return settings.keyQuestions.flatMap((kind) => notes.map((major) => keyCard(kind, major)));
    case 'neck':
      return directions.flatMap((direction) =>
        notes.map((from) => stepCard('neck', direction, from)),
      );
    case 'next':
      // A lap goes through every note, whichever one it starts from.
      return settings.order === 'laps'
        ? directions.flatMap((direction) =>
            CIRCLE_OF_FOURTHS.map((from) => stepCard('next', direction, from)),
          )
        : directions.flatMap((direction) =>
            settings.steps.flatMap((steps) =>
              notes.map((from) => stepCard('next', direction, from, steps)),
            ),
          );
  }
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: CircleSettings): string[] {
  const { exercise } = settings;
  const problems: string[] = [];
  if (exercise !== 'keys' && settings.directions.length === 0) {
    problems.push('Pick a direction: fourths, fifths or both.');
  }
  if (exercise === 'next' && settings.order === 'random' && settings.steps.length === 0) {
    problems.push('Pick how many steps round to ask.');
  }
  if (exercise === 'keys' && settings.keyQuestions.length === 0) {
    problems.push('Pick at least one kind of question.');
  }
  if (settings.notes.length === 0) {
    problems.push(
      exercise === 'keys' ? 'Pick at least one key.' : 'Pick at least one note to start from.',
    );
  }
  return problems;
}

/** What an answer is, which decides the buttons: a note, a minor key or a key signature. */
export type AnswerKind = 'note' | 'minor' | 'signature';

export function answerKind(card: CircleCard): AnswerKind {
  if (card.kind === 'signature') {
    return 'signature';
  }
  return card.kind === 'relative' ? 'minor' : 'note';
}

/**
 * The answers to choose from: every note or minor key in pitch order, so a button's place gives
 * nothing away, or every signature from six flats to five sharps.
 */
export function answerOptions(kind: AnswerKind): { value: number; label: string }[] {
  if (kind === 'signature') {
    // "None" keeps the button on one line, like the others.
    return KEY_SIGNATURES.map((signature) => ({
      value: signature,
      label: signature === 0 ? 'None' : signatureLabel(signature),
    }));
  }
  const label = kind === 'minor' ? minorKeyLabel : circleNoteLabel;
  return Array.from({ length: 12 }, (_, pitchClass) => ({
    value: pitchClass,
    label: label(pitchClass),
  }));
}

/**
 * Whether a played note answers the card: the right note in any octave, or the root of the
 * right minor key. A key signature can't be played.
 */
export function answersCard(card: CircleCard, midi: number): boolean {
  return answerKind(card) !== 'signature' && mod(midi, 12) === card.answer;
}

/** The question in words: "What comes after" / "E♭" / "in fourths". */
export interface Prompt {
  readonly ask: string;
  readonly subject: string;
  readonly detail: string;
}

export function promptOf(card: CircleCard): Prompt {
  switch (card.kind) {
    case 'next':
    case 'neck':
      return {
        ask: card.steps === 1 ? 'What comes after' : `What comes ${card.steps} steps after`,
        subject: circleNoteLabel(card.from),
        detail: `in ${card.direction}`,
      };
    case 'signature':
      return {
        ask: 'How many sharps or flats in',
        subject: `${circleNoteLabel(card.major)} major`,
        detail: '',
      };
    case 'key':
      return {
        ask: 'Which major key has',
        subject: signatureLabel(keySignature(card.major)),
        detail: '',
      };
    case 'relative':
      return {
        ask: 'What is the relative minor of',
        subject: `${circleNoteLabel(card.major)} major`,
        detail: '',
      };
  }
}

/** The strings an On the neck note can be on: those with a next string that way round. */
const NECK_STRINGS: Readonly<Record<CircleDirection, readonly number[]>> = {
  fourths: [2, 3, 4, 5, 6],
  fifths: [1, 2, 3, 4, 5],
};
/** Highest fret an On the neck note is shown at, leaving room for the next one. */
const NECK_MAX_FRET = 10;

/** Where an On the neck card shows its note this time: a fretted place picked at random. */
export function neckSpot(card: StepCard, random: () => number = Math.random): FretPosition {
  const spots = findNotePositions(card.from, NECK_STRINGS[card.direction], NECK_MAX_FRET).filter(
    (spot) => spot.fret > 0,
  );
  const { string, fret } = spots[Math.floor(random() * spots.length)];
  return { string, fret };
}

/**
 * The next note round from a place on the neck, as a guitarist reaches it: the same fret on the
 * next string, thinner in fourths and thicker in fifths. Between the G and B strings, which are
 * a third apart rather than a fourth, it's a fret further.
 */
export function nextSpot(direction: CircleDirection, spot: FretPosition): FretPosition {
  return direction === 'fourths'
    ? { string: spot.string - 1, fret: spot.fret + (spot.string === 3 ? 1 : 0) }
    : { string: spot.string + 1, fret: spot.fret - (spot.string === 2 ? 1 : 0) };
}

/** The shape of the step on the neck, in words, shown once answered. */
export function shapeHint(direction: CircleDirection, spot: FretPosition): string {
  if (direction === 'fourths') {
    return spot.string === 3
      ? 'One fret up on the next thinner string: G to B is a third, not a fourth.'
      : 'Same fret on the next thinner string.';
  }
  return spot.string === 2
    ? 'One fret down on the next thicker string: B to G is a third, not a fourth.'
    : 'Same fret on the next thicker string.';
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): CircleCard | undefined {
  const parts = key.split('|');
  const isDirection = (part: string) => CIRCLE_DIRECTIONS.includes(part as CircleDirection);
  const note = parts.at(-1) ?? '';
  if (parts.length === 3 && parts[0] === 'neck' && isDirection(parts[1])) {
    return CIRCLE_NOTE_NAMES.includes(note)
      ? stepCard('neck', parts[1] as CircleDirection, pitchClassOfName(note))
      : undefined;
  }
  if (parts.length === 2 && KEY_QUESTIONS.includes(parts[0] as KeyQuestion)) {
    return CIRCLE_NOTE_NAMES.includes(note)
      ? keyCard(parts[0] as KeyQuestion, pitchClassOfName(note))
      : undefined;
  }
  const [direction, name, stepsText] = parts;
  const steps = stepsText === undefined ? 1 : Number(stepsText);
  const known =
    parts.length <= 3 &&
    isDirection(direction) &&
    CIRCLE_NOTE_NAMES.includes(name) &&
    STEP_CHOICES.includes(steps) &&
    (stepsText === undefined || (steps > 1 && stepsText === String(steps)));
  return known
    ? stepCard('next', direction as CircleDirection, pitchClassOfName(name), steps)
    : undefined;
}

/** A card in words, for the summary's slowest cards and the stats: "E♭ → A♭", in fourths. */
export function describeCard(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  if (!card) {
    return undefined;
  }
  if (isStepCard(card)) {
    return {
      title: `${circleNoteLabel(card.from)} → ${circleNoteLabel(card.answer)}`,
      detail:
        `in ${card.direction}` +
        (card.steps === 1 ? '' : `, ${card.steps} steps`) +
        (card.kind === 'neck' ? ', on the neck' : ''),
    };
  }
  const major = circleNoteLabel(card.major);
  switch (card.kind) {
    case 'signature':
      return { title: `${major} major: ${signatureLabel(card.answer)}`, detail: 'key signature' };
    case 'key':
      return {
        title: `${signatureLabel(keySignature(card.major))}: ${major} major`,
        detail: 'key from its signature',
      };
    case 'relative':
      return { title: `${major} → ${minorKeyLabel(card.answer)}`, detail: 'relative minor' };
  }
}

/** A row of the stats grid: one kind of question, with a column per note or key. */
export interface GridRow {
  readonly id: string;
  readonly label: string;
  /** The card key of the row's question about a note. */
  keyFor(pitchClass: number): string;
}

export const GRID_ROWS: readonly GridRow[] = [
  ...CIRCLE_DIRECTIONS.flatMap((direction) =>
    STEP_CHOICES.map((steps) => ({
      id: `${direction}|${steps}`,
      label: DIRECTION_LABELS[direction] + (steps === 1 ? '' : `, ${steps} steps`),
      keyFor: (from: number) => stepCard('next', direction, from, steps).key,
    })),
  ),
  ...CIRCLE_DIRECTIONS.map((direction) => ({
    id: `neck|${direction}`,
    label: `${DIRECTION_LABELS[direction]} on the neck`,
    keyFor: (from: number) => stepCard('neck', direction, from).key,
  })),
  ...KEY_QUESTIONS.map((kind) => ({
    id: kind,
    label: KEY_QUESTION_LABELS[kind],
    keyFor: (major: number) => keyCard(kind, major).key,
  })),
];
