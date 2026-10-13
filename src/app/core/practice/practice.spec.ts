import { UNSEEN_WEIGHT, cardWeight, pickNextCard } from './scheduler';
import {
  StatsByCard,
  accuracy,
  isStatsByCard,
  recordResult,
  smoothedMissRate,
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
    expect(stats['a']).toEqual({ attempts: 2, correct: 1, totalResponseMs: 4000, lastSeen: 2 });
    expect(accuracy(stats['a'])).toBe(0.5);
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
    expect(isStatsByCard({ a: { attempts: '1' } })).toBe(false);
    expect(isStatsByCard([])).toBe(false);
    expect(isStatsByCard(null)).toBe(false);
  });
});

describe('pickNextCard', () => {
  it('never repeats the previous card when there is a choice', () => {
    for (const value of [0, 0.3, 0.6, 0.99]) {
      expect(pickNextCard(cards, {}, 'a', () => value).key).not.toBe('a');
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
      picks[pickNextCard([{ key: 'a' }, { key: 'b' }] as const, stats, null, random).key]++;
    }
    expect(picks.b).toBeGreaterThan(picks.a * 5);
  });

  it('weights unseen cards above any answered card', () => {
    const missedEveryTime = { attempts: 50, correct: 0, totalResponseMs: 0, lastSeen: 0 };
    expect(cardWeight({}, 'new')).toBe(UNSEEN_WEIGHT);
    expect(cardWeight({ x: missedEveryTime }, 'x')).toBeLessThan(UNSEEN_WEIGHT);
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
