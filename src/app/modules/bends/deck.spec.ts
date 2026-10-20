import { bendFor, buildDeck, cardFromKey, describeCard, settingsProblems } from './deck';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('bends deck', () => {
  it('makes a card per string and size of bend', () => {
    const deck = buildDeck({ ...DEFAULT_SETTINGS, strings: [3, 2], sizes: [1, 2] });

    expect(deck.map((card) => card.key)).toEqual(['2:1', '2:2', '3:1', '3:2']);
    deck.forEach((card) => expect(cardFromKey(card.key)).toEqual(card));
    expect(cardFromKey('6:2')).toBeUndefined();
    expect(cardFromKey('3:4')).toBeUndefined();
  });

  it('says what is missing before a session can start', () => {
    expect(settingsProblems({ ...DEFAULT_SETTINGS, strings: [] })).toEqual([
      'Pick at least one string.',
    ]);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, sizes: [] })).toEqual([
      'Pick at least one size of bend.',
    ]);
    expect(settingsProblems(DEFAULT_SETTINGS)).toEqual([]);
  });

  it('starts a bend on a fret from the 5th up to the highest chosen', () => {
    const wholeStepOnG = cardFromKey('3:2')!;

    expect(bendFor(wholeStepOnG, 12, () => 0)).toEqual({
      string: 3,
      fret: 5,
      start: 60,
      target: 62,
    });
    expect(bendFor(wholeStepOnG, 12, () => 0.999).fret).toBe(12);
    expect(bendFor(wholeStepOnG, 17, () => 0.999).fret).toBe(17);
  });

  it('names a card for the stats', () => {
    expect(describeCard(cardFromKey('2:3')!)).toEqual({
      title: 'Step and a half',
      detail: 'string 2 (B)',
    });
  });

  it('rebuilds settings from saved data', () => {
    expect(sanitizeSettings({ strings: [1, 6], sizes: [3], maxFret: 20, target: 'ask' })).toEqual({
      strings: [1],
      sizes: [3],
      maxFret: 12,
      target: 'ask',
    });
  });
});
