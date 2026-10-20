import { SymbolChord, parseChordSymbol } from '../../core/music/chords';
import { PracticeCard } from '../../core/practice/practice-run';
import { CHORD_IDS, ChangesSettings, CountMode } from './settings';

/**
 * A chord to change to; its id is its symbol, e.g. "Am". The microphone hears its notes, so any
 * shape of it counts.
 */
export type OpenChord = SymbolChord;

/** The chords of the first position, as most players learn them. */
export const OPEN_CHORDS: readonly OpenChord[] = CHORD_IDS.map((id) => parseChordSymbol(id)!);

/** Two chords to change between. */
export interface PairCard extends PracticeCard {
  /** The two chord ids in catalog order, e.g. "C-G". */
  readonly key: string;
  readonly first: OpenChord;
  readonly second: OpenChord;
}

/** Every pair of the chosen chords, in catalog order. */
export function buildDeck(settings: ChangesSettings): PairCard[] {
  const chosen = OPEN_CHORDS.filter((chord) => settings.chords.includes(chord.id));
  return chosen.flatMap((first, index) =>
    chosen.slice(index + 1).map((second) => pairCard(first, second)),
  );
}

function pairCard(first: OpenChord, second: OpenChord): PairCard {
  return { key: `${first.id}-${second.id}`, first, second };
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: ChangesSettings): string[] {
  return settings.chords.length < 2 ? ['Pick at least two chords to change between.'] : [];
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): PairCard | undefined {
  const [first, second] = key.split('-').map((id) => OPEN_CHORDS.find((chord) => chord.id === id));
  return first && second ? pairCard(first, second) : undefined;
}

/** "C ⇄ G". */
export function pairName(card: PairCard): string {
  return `${card.first.name} ⇄ ${card.second.name}`;
}

/** One take, as kept for the stats. */
export interface TakeRecord {
  /** The card key, e.g. "C-G". */
  readonly pair: string;
  readonly changes: number;
  /** Length of the take. */
  readonly seconds: number;
  /** Epoch milliseconds. */
  readonly at: number;
  readonly counted: CountMode;
}

export const TAKES_KEPT = 500;

/** Changes per minute, so takes of different lengths compare. */
export function perMinute(take: Pick<TakeRecord, 'changes' | 'seconds'>): number {
  return (take.changes * 60) / take.seconds;
}

/** The pair's best changes per minute, or null before its first take. */
export function bestPerMinute(takes: readonly TakeRecord[], pair: string): number | null {
  const rates = takes.filter((take) => take.pair === pair).map(perMinute);
  return rates.length > 0 ? Math.max(...rates) : null;
}

/**
 * A take passes when it ties or beats the pair's best so far, so the pairs you aren't improving
 * on come up more often.
 */
export function passes(rate: number, bestBefore: number | null): boolean {
  return bestBefore === null || rate >= bestBefore;
}

/** "34 changes", or "17 changes in 30 s" for a take that isn't a minute long. */
export function changesText(take: Pick<TakeRecord, 'changes' | 'seconds'>): string {
  const count = `${take.changes} change${take.changes === 1 ? '' : 's'}`;
  return take.seconds === 60 ? count : `${count} in ${lengthText(take.seconds)}`;
}

/** "30 s", "1 minute", "2 minutes". */
export function lengthText(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const minutes = seconds / 60;
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

/** Structural check for takes read back from storage. */
export function isTakes(value: unknown): value is TakeRecord[] {
  return (
    Array.isArray(value) &&
    value.every((take) => {
      const fields = (typeof take === 'object' && take !== null ? take : {}) as Record<
        string,
        unknown
      >;
      return (
        typeof fields['pair'] === 'string' &&
        ['changes', 'seconds', 'at'].every((field) => typeof fields[field] === 'number') &&
        (fields['seconds'] as number) > 0 &&
        (fields['counted'] === 'mic' || fields['counted'] === 'tap')
      );
    })
  );
}
