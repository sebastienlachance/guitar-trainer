import { scoreTake } from '../../core/audio/timing';
import {
  PATTERNS,
  biasWords,
  buildDeck,
  cardFromKey,
  isTakes,
  patternBeats,
  scoreSummary,
  settingsProblems,
  struckSlots,
  takePasses,
} from './deck';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('rhythm deck', () => {
  it('has a card per chosen subdivision and strumming pattern', () => {
    expect(buildDeck(DEFAULT_SETTINGS).map((card) => card.key)).toEqual(['quarter', 'eighth']);
    expect(
      buildDeck({ ...DEFAULT_SETTINGS, subdivisions: [], patterns: ['shuffle', 'campfire'] }).map(
        (card) => card.key,
      ),
    ).toEqual(['pattern:campfire', 'pattern:shuffle']);
    expect(cardFromKey('triplet')?.subdivision.perBeat).toBe(3);
    expect(cardFromKey('pattern:shuffle')?.subdivision.id).toBe('triplet');
    expect(cardFromKey('waltz')).toBeUndefined();
  });

  it('fills a bar exactly with each pattern, in strokes and rests', () => {
    for (const pattern of PATTERNS) {
      expect(pattern.strokes).toHaveLength(4 * pattern.grid.perBeat);
      expect(pattern.strokes).toMatch(/^[DU.]+$/);
    }
    const campfire = cardFromKey('pattern:campfire')!;
    expect(patternBeats(campfire.pattern!)).toBe('D· DU ·U DU');
    expect(struckSlots(campfire)).toEqual([true, false, true, true, false, true, true, true]);
    expect(struckSlots(cardFromKey('eighth')!)).toHaveLength(8);
  });

  it('passes a pattern take only with its rests left alone', () => {
    const campfire = cardFromKey('pattern:campfire')!;
    // Two bars of campfire at 120 bpm: strokes every 0.25 s on the struck slots.
    const slots = Array.from({ length: 16 }, (_, index) => index * 0.25);
    const strokes = slots.filter((_, index) => struckSlots(campfire)[index % 8]);
    const withRests = (rests: number[]) =>
      scoreTake(strokes, [...strokes, ...rests.map((index) => slots[index])], 0, 0.25);

    expect(takePasses(withRests([1]), campfire, 2)).toBe(true);
    expect(takePasses(withRests([1, 4]), campfire, 2)).toBe(false);
    expect(takePasses(withRests([1, 4, 9]), campfire, 4)).toBe(false);
    expect(takePasses(withRests([1, 4]), campfire, 4)).toBe(true);
    expect(takePasses(withRests([1, 4]), cardFromKey('eighth')!, 2)).toBe(true);
  });

  it('asks for calibration before the first session', () => {
    expect(settingsProblems(DEFAULT_SETTINGS, 'default')).toEqual([
      'Calibrate the timing first, in setup. It takes 15 seconds.',
    ]);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, latencyMs: 40 }, 'default')).toEqual([]);
    expect(
      settingsProblems({ ...DEFAULT_SETTINGS, latencyMs: 40, subdivisions: [] }, 'default'),
    ).toEqual(['Pick at least one subdivision or pattern.']);
    expect(
      settingsProblems(
        { ...DEFAULT_SETTINGS, latencyMs: 40, subdivisions: [], patterns: ['pop'] },
        'default',
      ),
    ).toEqual([]);
  });

  it('asks to calibrate again after switching to another input', () => {
    const calibrated = { ...DEFAULT_SETTINGS, latencyMs: 40, latencyInput: 'default' };

    expect(settingsProblems(calibrated, 'rocksmith')).toEqual([
      'The input changed since you calibrated: calibrate again, in setup.',
    ]);
    expect(settingsProblems({ ...calibrated, latencyInput: 'rocksmith' }, 'rocksmith')).toEqual([]);
    // Saved before inputs could be chosen: measured on the default microphone.
    expect(settingsProblems({ ...calibrated, latencyInput: null }, 'default')).toEqual([]);
  });

  it('keeps a saved latency only when it is plausible', () => {
    expect(sanitizeSettings({ latencyMs: 42 }).latencyMs).toBe(42);
    expect(sanitizeSettings({ latencyMs: 5000 }).latencyMs).toBeNull();
    expect(sanitizeSettings({}).latencyMs).toBeNull();
  });

  it('keeps the saved patterns this version knows, none before any was picked', () => {
    expect(sanitizeSettings({ patterns: ['campfire', 'polka'] }).patterns).toEqual(['campfire']);
    expect(sanitizeSettings({ subdivisions: ['eighth'] }).patterns).toEqual([]);
  });
});

describe('saved rhythm data', () => {
  it('checks takes read back from storage', () => {
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
    expect(isTakes([{ ...take, extra: 2 }])).toBe(true);
    expect(isTakes([{ ...take, passed: 'yes' }])).toBe(false);
    expect(isTakes([{ ...take, extra: 'two' }])).toBe(false);
  });
});

describe('take summary', () => {
  it('says how the take went in words', () => {
    const score = scoreTake([0, 0.5, 1, 1.5], [0.01, 0.51, 1.02, 1.5], 0, 0.5);

    expect(scoreSummary(score)).toBe('On time 100% · on average 10 ms late · spread 7 ms');
    const withRest = scoreTake([0, 1], [0, 0.5, 1], 0, 0.5);
    expect(scoreSummary(withRest)).toBe(
      'On time 100% · right on the beat on average · spread 0 ms',
    );
    expect(scoreSummary(withRest, true)).toBe(
      'On time 100% · right on the beat on average · spread 0 ms · 1 strike in a rest',
    );
    expect(biasWords(-12)).toBe('on average 12 ms early');
    expect(biasWords(1.4)).toBe('right on the beat on average');
  });
});
