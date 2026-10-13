import { StatsByCard, smoothedMissRate } from './stats';

/** Cards never answered come up more often than any answered card, so the deck gets covered. */
export const UNSEEN_WEIGHT = 1;

export function cardWeight(stats: StatsByCard, cardKey: string): number {
  const card = stats[cardKey];
  return card ? smoothedMissRate(card) : UNSEEN_WEIGHT;
}

/**
 * Weighted random pick that favors cards you miss. Never returns the previous card twice in a
 * row unless it is the only one.
 */
export function pickNextCard<T extends { readonly key: string }>(
  cards: readonly T[],
  stats: StatsByCard,
  previousKey: string | null,
  random: () => number = Math.random,
): T {
  if (cards.length === 0) {
    throw new Error('Cannot pick from an empty deck');
  }
  const candidates = cards.length > 1 ? cards.filter((card) => card.key !== previousKey) : cards;
  const weights = candidates.map((card) => cardWeight(stats, card.key));
  let remaining = random() * weights.reduce((sum, weight) => sum + weight, 0);
  for (let index = 0; index < candidates.length; index++) {
    remaining -= weights[index];
    if (remaining < 0) {
      return candidates[index];
    }
  }
  return candidates[candidates.length - 1];
}
