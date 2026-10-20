import { STANDARD_TUNING, stringLabel } from '../../core/fretboard/tuning';
import { commonNoteName, mod } from '../../core/music/notes';
import { PracticeCard } from '../../core/practice/practice-run';
import { capitalize } from '../../core/ui/text';
import { BEND_SIZES, BEND_STRINGS, BendsSettings } from './settings';

/** Bends start from this fret up: lower down, the strings are too stiff to bend far. */
export const MIN_START_FRET = 5;

const SIZE_NAMES: Readonly<Record<number, string>> = {
  1: 'half step',
  2: 'whole step',
  3: 'step and a half',
};

/** A bend on one string, of one size; it starts on a new fret each time it comes up. */
export interface BendCard extends PracticeCard {
  /** String and semitones, e.g. "3:2" for a whole step on the G string. */
  readonly key: string;
  readonly string: number;
  readonly semitones: number;
}

function bendCard(string: number, semitones: number): BendCard {
  return { key: `${string}:${semitones}`, string, semitones };
}

export function buildDeck(settings: BendsSettings): BendCard[] {
  return BEND_STRINGS.filter((string) => settings.strings.includes(string)).flatMap((string) =>
    BEND_SIZES.filter((size) => settings.sizes.includes(size)).map((size) =>
      bendCard(string, size),
    ),
  );
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: BendsSettings): string[] {
  const problems: string[] = [];
  if (settings.strings.length === 0) {
    problems.push('Pick at least one string.');
  }
  if (settings.sizes.length === 0) {
    problems.push('Pick at least one size of bend.');
  }
  return problems;
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): BendCard | undefined {
  const [string, semitones] = key.split(':').map(Number);
  return BEND_STRINGS.includes(string) && BEND_SIZES.includes(semitones)
    ? bendCard(string, semitones)
    : undefined;
}

/** "half step", "whole step", "step and a half". */
export function sizeName(semitones: number): string {
  return SIZE_NAMES[semitones] ?? `${semitones} semitones`;
}

/** "Whole step" on "string 3 (G)", for the stats. */
export function describeCard(card: BendCard): { title: string; detail: string } {
  return { title: capitalize(sizeName(card.semitones)), detail: stringLabel(card.string) };
}

/** A bend to play: where it starts, and the note it reaches. */
export interface Bend {
  readonly string: number;
  readonly fret: number;
  /** The fretted note, as a MIDI number. */
  readonly start: number;
  /** The note to bend it up to. */
  readonly target: number;
}

/** Picks the fret a card's bend starts on this time. `random` is `Math.random` outside tests. */
export function bendFor(card: BendCard, maxFret: number, random: () => number): Bend {
  const frets = maxFret - MIN_START_FRET + 1;
  const fret = MIN_START_FRET + Math.min(frets - 1, Math.floor(random() * frets));
  const start = STANDARD_TUNING[card.string - 1] + fret;
  return { string: card.string, fret, start, target: start + card.semitones };
}

export function noteName(midi: number): string {
  return commonNoteName(mod(midi, 12));
}
