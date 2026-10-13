import { FrettedNote, positionStarts, scaleInPosition } from '../../core/fretboard/placement';
import { COMMON_NOTE_NAMES, commonNoteName } from '../../core/music/notes';
import { SCALE_TYPES, ScaleType, scaleTypeById } from '../../core/music/scales';
import { PracticeCard } from '../../core/practice/practice-run';
import { ScalesSettings } from './settings';

/** "Which scale is this?" about one scale, from one root, in one hand position. */
export interface ScaleCard extends PracticeCard {
  /** Identifies the card in stats: "dorian|G|2" for G Dorian in the position from fret 2. */
  readonly key: string;
  /** The answer. */
  readonly scale: ScaleType;
  /** Pitch class of the root (C = 0), marked on the fretboard. */
  readonly root: number;
  /** First fret of the hand position. */
  readonly start: number;
}

export function cardKey(scale: ScaleType, root: number, start: number): string {
  return `${scale.id}|${COMMON_NOTE_NAMES[root]}|${start}`;
}

/** Every chosen scale, from every root, in each position that fits the fret range. */
export function buildDeck(settings: ScalesSettings): ScaleCard[] {
  const scales = SCALE_TYPES.filter((scale) => settings.scales.includes(scale.id));
  return scales.flatMap((scale) =>
    COMMON_NOTE_NAMES.flatMap((_, root) =>
      positionStarts(root, settings.maxFret).map((start) => ({
        key: cardKey(scale, root, start),
        scale,
        root,
        start,
      })),
    ),
  );
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: ScalesSettings): string[] {
  return settings.scales.length < 2
    ? ['Pick at least two scales, to have something to choose between.']
    : [];
}

/** The notes the fretboard shows for a card. */
export function notesOf(card: ScaleCard): FrettedNote[] {
  return scaleInPosition(card.root, card.scale.intervals, card.start);
}

/** Where the card is, in words: "G root, frets 2–6". */
export function positionLabel(card: ScaleCard): string {
  return `${commonNoteName(card.root)} root, frets ${card.start}–${card.start + 4}`;
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): ScaleCard | undefined {
  const [scaleId, rootName, start] = key.split('|');
  const scale = scaleTypeById(scaleId);
  const root = COMMON_NOTE_NAMES.indexOf(rootName);
  if (!scale || root < 0 || !/^\d{1,2}$/.test(start ?? '')) {
    return undefined;
  }
  return { key, scale, root, start: Number(start) };
}
