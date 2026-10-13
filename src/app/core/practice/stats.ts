export interface CardStats {
  readonly attempts: number;
  readonly correct: number;
  readonly totalResponseMs: number;
  /** Epoch milliseconds of the last attempt. */
  readonly lastSeen: number;
}

export type StatsByCard = Readonly<Record<string, CardStats>>;

export interface PracticeResult {
  readonly correct: boolean;
  readonly responseMs: number;
  readonly at: number;
}

export function recordResult(
  stats: StatsByCard,
  cardKey: string,
  result: PracticeResult,
): StatsByCard {
  const previous = stats[cardKey] ?? { attempts: 0, correct: 0, totalResponseMs: 0, lastSeen: 0 };
  return {
    ...stats,
    [cardKey]: {
      attempts: previous.attempts + 1,
      correct: previous.correct + (result.correct ? 1 : 0),
      totalResponseMs: previous.totalResponseMs + result.responseMs,
      lastSeen: result.at,
    },
  };
}

export function accuracy(stats: Pick<CardStats, 'attempts' | 'correct'>): number {
  return stats.attempts === 0 ? 0 : stats.correct / stats.attempts;
}

export function averageResponseMs(stats: CardStats): number {
  return stats.attempts === 0 ? 0 : stats.totalResponseMs / stats.attempts;
}

/**
 * Miss rate pulled toward 50% while there are few attempts (Laplace smoothing), so one lucky
 * answer doesn't bury a card and one slip doesn't make it look hopeless.
 */
export function smoothedMissRate(stats: Pick<CardStats, 'attempts' | 'correct'>): number {
  return 1 - (stats.correct + 1) / (stats.attempts + 2);
}

/** Sums attempts and correct answers over every card whose key passes the filter. */
export function totals(
  stats: StatsByCard,
  includeKey: (key: string) => boolean = () => true,
): { attempts: number; correct: number } {
  let attempts = 0;
  let correct = 0;
  for (const [key, card] of Object.entries(stats)) {
    if (includeKey(key)) {
      attempts += card.attempts;
      correct += card.correct;
    }
  }
  return { attempts, correct };
}

/** Structural check for data read back from storage. */
export function isStatsByCard(value: unknown): value is StatsByCard {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(
    (card) =>
      typeof card === 'object' &&
      card !== null &&
      ['attempts', 'correct', 'totalResponseMs', 'lastSeen'].every(
        (field) => typeof (card as Record<string, unknown>)[field] === 'number',
      ),
  );
}
