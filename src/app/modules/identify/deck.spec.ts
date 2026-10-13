import { answerChoices, buildDeck, cardFromKey, settingsProblems } from './deck';
import { DEFAULT_SETTINGS, IdentifySettings, sanitizeSettings } from './settings';

const settings = (overrides: Partial<IdentifySettings>): IdentifySettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

describe('buildDeck', () => {
  it('asks about every position on the chosen strings up to the highest fret', () => {
    // 6 strings, frets 0 to 12.
    expect(buildDeck(DEFAULT_SETTINGS)).toHaveLength(78);
  });

  it('only asks about the chosen notes', () => {
    const deck = buildDeck(settings({ notes: ['E'], strings: [5, 6], maxFret: 12 }));
    expect(deck.map((card) => card.key)).toEqual(['5:7', '6:0', '6:12']);
    expect(deck.every((card) => card.pitchClass === 4)).toBe(true);
  });

  it('says what is missing', () => {
    const empty = settings({ notes: [], strings: [] });
    expect(settingsProblems(empty, buildDeck(empty))).toEqual([
      'Pick at least one note.',
      'Pick at least one string.',
    ]);
    const nothingInRange = settings({ notes: ['C#'], strings: [6], maxFret: 5 });
    expect(settingsProblems(nothingInRange, buildDeck(nothingInRange))).toHaveLength(1);
  });
});

describe('answerChoices', () => {
  it('offers all 12 notes in order from C', () => {
    expect(answerChoices(7, 12)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('offers the answer and three different others, in pitch order', () => {
    for (const seed of [0, 0.25, 0.5, 0.99]) {
      const choices = answerChoices(7, 4, () => seed);
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(7);
      expect(choices).toEqual([...choices].sort((a, b) => a - b));
    }
  });
});

describe('saved data', () => {
  it('round-trips card keys and ignores unknown ones', () => {
    expect(cardFromKey('5:7')).toEqual({ key: '5:7', string: 5, fret: 7, pitchClass: 4 });
    expect(cardFromKey('9:1')).toBeUndefined();
    expect(cardFromKey('C|5')).toBeUndefined();
  });

  it('keeps known settings and drops the rest', () => {
    const restored = sanitizeSettings({ notes: ['C', 'H'], choices: 6, strings: [1, 9] });
    expect(restored.notes).toEqual(['C']);
    expect(restored.choices).toBe(DEFAULT_SETTINGS.choices);
    expect(restored.strings).toEqual([1]);
  });
});
