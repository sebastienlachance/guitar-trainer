import { UNSEEN_WEIGHT, cardWeight, medianResponseMs, pickNextCard, slowness } from './scheduler';
import {
  CardStats,
  StatsByCard,
  accuracy,
  earlyAverageMs,
  isStatsByCard,
  recentAverageMs,
  recordResult,
  smoothedMissRate,
  speedBand,
  totals,
} from './stats';
import { StatsStore } from './stats-store';
import { STORAGE_PREFIX } from './storage';

const cards = [{ key: 'a' }, { key: 'b' }, { key: 'c' }];

function sequence(...values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe('stats', () => {
  it('accumulates attempts, correct answers and response time', () => {
    let stats: StatsByCard = {};
    stats = recordResult(stats, 'a', { correct: true, responseMs: 1000, at: 1 });
    stats = recordResult(stats, 'a', { correct: false, responseMs: 3000, at: 2 });
    expect(stats['a']).toMatchObject({
      attempts: 2,
      correct: 1,
      totalResponseMs: 4000,
      lastSeen: 2,
    });
    expect(accuracy(stats['a'])).toBe(0.5);
  });

  it('keeps the first and the latest times of correct answers', () => {
    let stats: StatsByCard = {};
    const times = [5000, 4000, 9000, 3000, 2500, 2000, 1500, 1200];
    times.forEach((responseMs, at) => {
      stats = recordResult(stats, 'a', { correct: responseMs !== 9000, responseMs, at });
    });

    // The 9 s answer was a miss: it counts in the overall average, not in the speed.
    expect(stats['a'].earlyMs).toEqual([5000, 4000, 3000]);
    expect(stats['a'].recentMs).toEqual([3000, 2500, 2000, 1500, 1200]);
    expect(earlyAverageMs(stats['a'])).toBe(4000);
    expect(recentAverageMs(stats['a'])).toBe(2040);
  });

  it('counts an answer without a time, leaving the times as they were', () => {
    let stats: StatsByCard = {};
    stats = recordResult(stats, 'a', { correct: true, responseMs: 2000, at: 1 });
    stats = recordResult(stats, 'a', { correct: true, responseMs: null, at: 2 });

    expect(stats['a']).toMatchObject({
      attempts: 2,
      correct: 2,
      totalResponseMs: 2000,
      lastSeen: 2,
      earlyMs: [2000],
      recentMs: [2000],
    });
  });

  it('lets cards saved before times were kept stand on their average', () => {
    const saved: StatsByCard = {
      a: { attempts: 4, correct: 4, totalResponseMs: 24000, lastSeen: 1 },
    };
    expect(recentAverageMs(saved['a'])).toBe(6000);
    expect(earlyAverageMs(saved['a'])).toBeNull();

    const stats = recordResult(saved, 'a', { correct: true, responseMs: 2000, at: 2 });

    expect(earlyAverageMs(stats['a'])).toBe(6000);
    expect(recentAverageMs(stats['a'])).toBe(2000);
  });

  it('bands times as fast, medium or slow', () => {
    expect(speedBand(null)).toBe('none');
    expect(speedBand(1500)).toBe('fast');
    expect(speedBand(3000)).toBe('medium');
    expect(speedBand(4500)).toBe('slow');
  });

  it('smooths the miss rate toward one half', () => {
    expect(smoothedMissRate({ attempts: 0, correct: 0 })).toBe(0.5);
    expect(smoothedMissRate({ attempts: 3, correct: 0 })).toBeCloseTo(0.8);
    expect(smoothedMissRate({ attempts: 10, correct: 10 })).toBeCloseTo(1 / 12);
  });

  it('totals a subset of cards', () => {
    const stats: StatsByCard = {
      'C|sus4': { attempts: 4, correct: 3, totalResponseMs: 0, lastSeen: 0 },
      'D|sus4': { attempts: 2, correct: 0, totalResponseMs: 0, lastSeen: 0 },
    };
    expect(totals(stats)).toEqual({ attempts: 6, correct: 3 });
    expect(totals(stats, (key) => key.startsWith('C|'))).toEqual({ attempts: 4, correct: 3 });
  });

  it('rejects malformed saved data', () => {
    expect(isStatsByCard({ a: { attempts: 1, correct: 1, totalResponseMs: 5, lastSeen: 9 } })).toBe(
      true,
    );
    expect(
      isStatsByCard({
        a: {
          attempts: 1,
          correct: 1,
          totalResponseMs: 5,
          lastSeen: 9,
          recentMs: [5],
          earlyMs: [5],
        },
      }),
    ).toBe(true);
    expect(
      isStatsByCard({
        a: { attempts: 1, correct: 1, totalResponseMs: 5, lastSeen: 9, recentMs: ['5'] },
      }),
    ).toBe(false);
    expect(isStatsByCard({ a: { attempts: '1' } })).toBe(false);
    expect(isStatsByCard([])).toBe(false);
    expect(isStatsByCard(null)).toBe(false);
  });
});

describe('pickNextCard', () => {
  it('never repeats the previous card when there is a choice', () => {
    for (const value of [0, 0.3, 0.6, 0.99]) {
      expect(pickNextCard(cards, {}, 'a', { random: () => value }).key).not.toBe('a');
    }
  });

  it('returns the only card even if it was the previous one', () => {
    expect(pickNextCard([{ key: 'a' }], {}, 'a').key).toBe('a');
  });

  it('favors cards you miss over cards you know', () => {
    const stats: StatsByCard = {
      a: { attempts: 10, correct: 10, totalResponseMs: 0, lastSeen: 0 },
      b: { attempts: 10, correct: 0, totalResponseMs: 0, lastSeen: 0 },
    };
    const picks = { a: 0, b: 0 };
    const random = sequence(...Array.from({ length: 100 }, (_, i) => i / 100));
    for (let i = 0; i < 100; i++) {
      picks[pickNextCard([{ key: 'a' }, { key: 'b' }] as const, stats, null, { random }).key]++;
    }
    expect(picks.b).toBeGreaterThan(picks.a * 5);
  });

  it('favors cards you answer slowly, even when you never miss', () => {
    const answered = (recentMs: number[]): CardStats => ({
      attempts: 10,
      correct: 10,
      totalResponseMs: 0,
      lastSeen: 0,
      recentMs,
    });
    const stats: StatsByCard = {
      fast: answered([1000, 1000]),
      usual: answered([2000, 2000]),
      slow: answered([5000, 5000]),
    };
    const picks = { fast: 0, usual: 0, slow: 0 };
    const random = sequence(...Array.from({ length: 300 }, (_, i) => i / 300));
    const deck = [{ key: 'fast' }, { key: 'usual' }, { key: 'slow' }] as const;
    for (let i = 0; i < 300; i++) {
      picks[pickNextCard(deck, stats, null, { random }).key]++;
    }
    expect(picks.slow).toBeGreaterThan(picks.usual * 5);
    // At or under your median there is no slowness: those cards weigh the same.
    expect(Math.abs(picks.usual - picks.fast)).toBeLessThanOrEqual(2);

    // When answer times mean nothing (a take lasts as long as it lasts), they weigh the same too.
    const untimed = { fast: 0, usual: 0, slow: 0 };
    const again = sequence(...Array.from({ length: 300 }, (_, i) => i / 300));
    for (let i = 0; i < 300; i++) {
      untimed[pickNextCard(deck, stats, null, { random: again, bySpeed: false }).key]++;
    }
    expect(Math.abs(untimed.slow - untimed.usual)).toBeLessThanOrEqual(2);
  });

  it('measures slowness against your own median, up to a limit', () => {
    const card = (ms: number): CardStats => ({
      attempts: 1,
      correct: 1,
      totalResponseMs: ms,
      lastSeen: 0,
    });
    const stats: StatsByCard = { a: card(1000), b: card(2000), c: card(3000), d: card(9000) };

    expect(medianResponseMs(stats, ['a', 'b', 'c', 'd', 'unseen'])).toBe(2500);
    expect(medianResponseMs(stats, ['unseen'])).toBeNull();
    expect(slowness(stats['a'], 2000)).toBe(0);
    expect(slowness(stats['c'], 2000)).toBe(0.5);
    expect(slowness(stats['d'], 2000)).toBe(1);
    expect(slowness(stats['d'], null)).toBe(0);
  });

  it('weights unseen cards at least as much as any answered card', () => {
    const missedAndSlow = { attempts: 50, correct: 0, totalResponseMs: 50 * 9000, lastSeen: 0 };
    expect(cardWeight({}, 'new')).toBe(UNSEEN_WEIGHT);
    expect(cardWeight({ x: missedAndSlow }, 'x', 1000)).toBeLessThanOrEqual(UNSEEN_WEIGHT);
  });

  it('refuses an empty deck', () => {
    expect(() => pickNextCard([], {}, null)).toThrow();
  });
});

describe('StatsStore', () => {
  beforeEach(() => localStorage.clear());

  it('saves results and loads them back', () => {
    new StatsStore('test').record('a', { correct: true, responseMs: 10, at: 1 });
    expect(new StatsStore('test').stats()['a'].correct).toBe(1);
  });

  it('starts empty when saved data is corrupt', () => {
    localStorage.setItem(STORAGE_PREFIX + 'test', '{not json');
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(new StatsStore('test').stats()).toEqual({});
  });

  it('resets everything', () => {
    const store = new StatsStore('test');
    store.record('a', { correct: true, responseMs: 10, at: 1 });
    store.reset();
    expect(new StatsStore('test').stats()).toEqual({});
  });
});
