import { CardStats, StatsByCard, recentAverageMs, smoothedMissRate } from './stats';

/**
 * Cards never answered come up at least as often as any answered card (whose weight is at most
 * a miss rate of 1 plus a slowness of 1), so the deck gets covered.
 */
export const UNSEEN_WEIGHT = 2;

/** The most slowness can add to a card's weight: as much as always missing it. */
const MAX_SLOWNESS = 1;

/** The middle of your recent answer times over the given cards; null when none was answered. */
export function medianResponseMs(stats: StatsByCard, keys: readonly string[]): number | null {
  const times = keys
    .flatMap((key) => (stats[key] ? [recentAverageMs(stats[key])] : []))
    .sort((a, b) => a - b);
  if (times.length === 0) {
    return null;
  }
  const middle = Math.floor(times.length / 2);
  return times.length % 2 ? times[middle] : (times[middle - 1] + times[middle]) / 2;
}

/**
 * How much slower than usual you answer a card: 0 at or under your median time, rising to 1 at
 * twice it. Relative, so it works whether answers take half a second or five.
 */
export function slowness(card: CardStats, medianMs: number | null): number {
  if (!medianMs) {
    return 0;
  }
  return Math.min(MAX_SLOWNESS, Math.max(0, recentAverageMs(card) / medianMs - 1));
}

/** How strongly a card asks to be practised: the misses, plus the slowness. */
export function cardWeight(
  stats: StatsByCard,
  cardKey: string,
  medianMs: number | null = null,
): number {
  const card = stats[cardKey];
  return card ? smoothedMissRate(card) + slowness(card, medianMs) : UNSEEN_WEIGHT;
}

export interface PickOptions {
  /** Favour the cards you answer slowly too (the default); off when answer times mean nothing. */
  readonly bySpeed?: boolean;
  readonly random?: () => number;
}

/**
 * Weighted random pick that favors cards you miss or answer slowly. Never returns the previous
 * card twice in a row unless it is the only one.
 */
export function pickNextCard<T extends { readonly key: string }>(
  cards: readonly T[],
  stats: StatsByCard,
  previousKey: string | null,
  { bySpeed = true, random = Math.random }: PickOptions = {},
): T {
  if (cards.length === 0) {
    throw new Error('Cannot pick from an empty deck');
  }
  const candidates = cards.length > 1 ? cards.filter((card) => card.key !== previousKey) : cards;
  const medianMs = bySpeed
    ? medianResponseMs(
        stats,
        cards.map((card) => card.key),
      )
    : null;
  const weights = candidates.map((card) => cardWeight(stats, card.key, medianMs));
  let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < candidates.length; index++) {
    remaining -= weights[index];
    if (remaining < 0) {
      return candidates[index];
    }
  }
  return candidates[candidates.length - 1];
}
