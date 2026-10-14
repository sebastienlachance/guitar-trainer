import { scoreTake } from '../../core/audio/timing';
import {
  biasWords,
  buildDeck,
  cardFromKey,
  isLevels,
  isTakes,
  nextLevel,
  scoreSummary,
  settingsProblems,
} from './deck';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('rhythm deck', () => {
  it('has a card per chosen subdivision', () => {
    expect(buildDeck(DEFAULT_SETTINGS).map((card) => card.key)).toEqual(['quarter', 'eighth']);
    expect(cardFromKey('triplet')?.subdivision.perBeat).toBe(3);
    expect(cardFromKey('waltz')).toBeUndefined();
  });

  it('asks for calibration before the first session', () => {
    expect(settingsProblems(DEFAULT_SETTINGS)).toEqual([
      'Calibrate the timing first, in setup. It takes 15 seconds.',
    ]);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, latencyMs: 40 })).toEqual([]);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, latencyMs: 40, subdivisions: [] })).toEqual([
      'Pick at least one subdivision.',
    ]);
  });

  it('keeps a saved latency only when it is plausible', () => {
    expect(sanitizeSettings({ latencyMs: 42 }).latencyMs).toBe(42);
    expect(sanitizeSettings({ latencyMs: 5000 }).latencyMs).toBeNull();
    expect(sanitizeSettings({}).latencyMs).toBeNull();
  });
});

describe('tempo ladder', () => {
  it('goes up after a pass, and down after two fails in a row', () => {
    expect(nextLevel({ bpm: 96, failStreak: 1 }, true)).toEqual({ bpm: 100, failStreak: 0 });
    expect(nextLevel({ bpm: 96, failStreak: 0 }, false)).toEqual({ bpm: 96, failStreak: 1 });
    expect(nextLevel({ bpm: 96, failStreak: 1 }, false)).toEqual({ bpm: 92, failStreak: 0 });
  });

  it('stays within 40 and 240 bpm', () => {
    expect(nextLevel({ bpm: 240, failStreak: 0 }, true).bpm).toBe(240);
    expect(nextLevel({ bpm: 40, failStreak: 1 }, false).bpm).toBe(40);
  });
});

describe('saved rhythm data', () => {
  it('checks levels and takes read back from storage', () => {
    expect(isLevels({ eighth: { bpm: 96, failStreak: 0 } })).toBe(true);
    expect(isLevels({ eighth: { bpm: '96' } })).toBe(false);
    const take = {
      subdivision: 'eighth',
      bpm: 96,
      at: 1,
      onTimePct: 90,
      biasMs: 8,
      spreadMs: 14,
      meanAbsMs: 12,
      missed: 0,
      passed: true,
    };
    expect(isTakes([take])).toBe(true);
    expect(isTakes([{ ...take, passed: 'yes' }])).toBe(false);
  });
});

describe('take summary', () => {
  it('says how the take went in words', () => {
    const score = scoreTake([0, 0.5, 1, 1.5], [0.01, 0.51, 1.02, 1.5], 0, 0.5);

    expect(scoreSummary(score)).toBe('On time 100% · on average 10 ms late · spread 7 ms');
    expect(biasWords(-12)).toBe('on average 12 ms early');
    expect(biasWords(1.4)).toBe('right on the beat on average');
  });
});
