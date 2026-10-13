import { FretPosition } from '../../core/fretboard/fretboard';
import { pitchClassAt } from '../../core/fretboard/placement';
import { STRING_NUMBERS } from '../../core/fretboard/tuning';
import { parseNote, pitchClassOf } from '../../core/music/notes';
import { PracticeCard } from '../../core/practice/practice-run';
import { ChoiceCount, IdentifySettings } from './settings';

/** "Which note is this?" about one position on the neck. */
export interface IdentifyCard extends PracticeCard, FretPosition {
  /** Identifies the card in stats: "5:7" for string 5, fret 7. */
  readonly key: string;
  /** The answer: pitch class of the note at the position (C = 0). */
  readonly pitchClass: number;
}

export function cardAt(position: FretPosition): IdentifyCard {
  return {
    key: `${position.string}:${position.fret}`,
    string: position.string,
    fret: position.fret,
    pitchClass: pitchClassAt(position),
  };
}

/** Every position on the chosen strings, up to the highest fret, whose note was chosen. */
export function buildDeck(settings: IdentifySettings): IdentifyCard[] {
  const pitchClasses = settings.notes.map((name) => pitchClassOf(parseNote(name)));
  return settings.strings
    .flatMap((string) =>
      Array.from({ length: settings.maxFret + 1 }, (_, fret) => cardAt({ string, fret })),
    )
    .filter((card) => pitchClasses.includes(card.pitchClass));
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(
  settings: IdentifySettings,
  deck: readonly IdentifyCard[],
): string[] {
  const problems: string[] = [];
  if (settings.notes.length === 0) {
    problems.push('Pick at least one note.');
  }
  if (settings.strings.length === 0) {
    problems.push('Pick at least one string.');
  }
  if (problems.length === 0 && deck.length === 0) {
    problems.push(`None of these notes are within frets 0–${settings.maxFret} on these strings.`);
  }
  return problems;
}

/**
 * The pitch classes to choose from, in order from C: all 12, or the answer plus others picked at
 * random. Ordering by pitch keeps the answer's place from giving it away.
 */
export function answerChoices(
  answer: number,
  count: ChoiceCount,
  random: () => number = Math.random,
): number[] {
  const all = Array.from({ length: 12 }, (_, pitchClass) => pitchClass);
  if (count === 12) {
    return all;
  }
  const others = all.filter((pitchClass) => pitchClass !== answer);
  for (let index = others.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [others[index], others[swap]] = [others[swap], others[index]];
  }
  return [answer, ...others.slice(0, count - 1)].sort((a, b) => a - b);
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): IdentifyCard | undefined {
  const match = /^(\d):(\d{1,2})$/.exec(key);
  if (!match || !STRING_NUMBERS.includes(Number(match[1]))) {
    return undefined;
  }
  return cardAt({ string: Number(match[1]), fret: Number(match[2]) });
}
