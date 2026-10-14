export interface CardStats {
  readonly attempts: number;
  readonly correct: number;
  readonly totalResponseMs: number;
  /** Epoch milliseconds of the last attempt. */
  readonly lastSeen: number;
  /** Times of the first correct answers, up to EARLY_TIMES: how fast you were then. */
  readonly earlyMs?: readonly number[];
  /** Times of the latest correct answers, up to RECENT_TIMES: how fast you are now. */
  readonly recentMs?: readonly number[];
}

export const EARLY_TIMES = 3;
export const RECENT_TIMES = 5;

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
  const recent = previous.recentMs ?? [];
  return {
    ...stats,
    [cardKey]: {
      attempts: previous.attempts + 1,
      correct: previous.correct + (result.correct ? 1 : 0),
      totalResponseMs: previous.totalResponseMs + result.responseMs,
      lastSeen: result.at,
      earlyMs: earlyTimes(previous, result),
      recentMs: result.correct ? [...recent, result.responseMs].slice(-RECENT_TIMES) : recent,
    },
  };
}

/** Speed only counts correct answers: a miss says nothing about how fast you find the answer. */
function earlyTimes(previous: CardStats, result: PracticeResult): readonly number[] {
  if (previous.attempts > 0 && previous.earlyMs === undefined) {
    // Saved before times were kept: its average so far stands in for its first answers.
    return [averageResponseMs(previous)];
  }
  const early = previous.earlyMs ?? [];
  return result.correct && early.length < EARLY_TIMES ? [...early, result.responseMs] : early;
}

export function accuracy(stats: Pick<CardStats, 'attempts' | 'correct'>): number {
  return stats.attempts === 0 ? 0 : stats.correct / stats.attempts;
}

export function averageResponseMs(stats: CardStats): number {
  return stats.attempts === 0 ? 0 : stats.totalResponseMs / stats.attempts;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** How fast you answer the card now: your latest correct answers, or the overall average. */
export function recentAverageMs(stats: CardStats): number {
  return stats.recentMs?.length ? mean(stats.recentMs) : averageResponseMs(stats);
}

/** How fast you answered the card at first, or null when that wasn't kept. */
export function earlyAverageMs(stats: CardStats): number | null {
  return stats.earlyMs?.length ? mean(stats.earlyMs) : null;
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

function isTimeList(value: unknown): boolean {
  return value === undefined || (Array.isArray(value) && value.every((v) => typeof v === 'number'));
}

/** Structural check for data read back from storage, including data saved by older versions. */
export function isStatsByCard(value: unknown): value is StatsByCard {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every((card) => {
    if (typeof card !== 'object' || card === null) {
      return false;
    }
    const fields = card as Record<string, unknown>;
    return (
      ['attempts', 'correct', 'totalResponseMs', 'lastSeen'].every(
        (field) => typeof fields[field] === 'number',
      ) &&
      isTimeList(fields['earlyMs']) &&
      isTimeList(fields['recentMs'])
    );
  });
}

/** Accuracy bands used to colour results: under 50%, under 80%, and 80% or more. */
export type AccuracyBand = 'none' | 'low' | 'mid' | 'high';

export function accuracyBand(stats: Pick<CardStats, 'attempts' | 'correct'>): AccuracyBand {
  if (stats.attempts === 0) {
    return 'none';
  }
  const rate = accuracy(stats);
  if (rate >= 0.8) {
    return 'high';
  }
  return rate >= 0.5 ? 'mid' : 'low';
}

export type SpeedBand = 'none' | 'fast' | 'medium' | 'slow';

/** Times that separate fast, medium and slow answers. */
export interface SpeedLimits {
  readonly fastMs: number;
  readonly slowMs: number;
}

export const DEFAULT_SPEED_LIMITS: SpeedLimits = { fastMs: 2000, slowMs: 4000 };

export function speedBand(ms: number | null, limits = DEFAULT_SPEED_LIMITS): SpeedBand {
  if (ms === null) {
    return 'none';
  }
  if (ms < limits.fastMs) {
    return 'fast';
  }
  return ms <= limits.slowMs ? 'medium' : 'slow';
}
