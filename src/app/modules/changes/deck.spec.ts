import {
  OPEN_CHORDS,
  TakeRecord,
  bestPerMinute,
  buildDeck,
  cardFromKey,
  changesText,
  isTakes,
  pairName,
  passes,
  perMinute,
  settingsProblems,
} from './deck';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

function take(pair: string, changes: number, seconds = 60): TakeRecord {
  return { pair, changes, seconds, at: 0, counted: 'mic' };
}

describe('chord changes deck', () => {
  it('spells each chord from its root', () => {
    const notes = (id: string) => OPEN_CHORDS.find((chord) => chord.id === id)?.pitchClasses;

    expect(notes('C')).toEqual([0, 4, 7]);
    expect(notes('Am')).toEqual([9, 0, 4]);
    expect(notes('F')).toEqual([5, 9, 0]);
    expect(OPEN_CHORDS.map((chord) => chord.name)).toContain('Dm');
  });

  it('makes a card of every pair of the chosen chords', () => {
    const deck = buildDeck({ ...DEFAULT_SETTINGS, chords: ['Am', 'C', 'G'] });

    expect(deck.map((card) => card.key)).toEqual(['C-G', 'C-Am', 'G-Am']);
    expect(pairName(deck[1])).toBe('C ⇄ Am');
  });

  it('needs two chords to change between', () => {
    expect(settingsProblems({ ...DEFAULT_SETTINGS, chords: ['C'] })).toEqual([
      'Pick at least two chords to change between.',
    ]);
    expect(settingsProblems(DEFAULT_SETTINGS)).toEqual([]);
  });

  it('rebuilds a card from its key, and ignores unknown chords', () => {
    expect(cardFromKey('C-G')?.second.name).toBe('G');
    expect(cardFromKey('C-H')).toBeUndefined();
  });

  it('compares takes of any length by changes a minute', () => {
    expect(perMinute(take('C-G', 17, 30))).toBe(34);
    expect(bestPerMinute([take('C-G', 30), take('C-G', 17, 30), take('G-D', 50)], 'C-G')).toBe(34);
    expect(bestPerMinute([], 'C-G')).toBeNull();
  });

  it('passes a take that ties or beats the best so far', () => {
    expect(passes(30, null)).toBe(true);
    expect(passes(30, 30)).toBe(true);
    expect(passes(29, 30)).toBe(false);
  });

  it('says how many changes, and in what time when not a minute', () => {
    expect(changesText(take('C-G', 34))).toBe('34 changes');
    expect(changesText(take('C-G', 1))).toBe('1 change');
    expect(changesText(take('C-G', 17, 30))).toBe('17 changes in 30 s');
    expect(changesText(take('C-G', 60, 120))).toBe('60 changes in 2 minutes');
  });

  it('keeps only well-formed takes from storage', () => {
    expect(isTakes([take('C-G', 30)])).toBe(true);
    expect(isTakes([{ ...take('C-G', 30), seconds: 0 }])).toBe(false);
    expect(isTakes([{ pair: 'C-G', changes: 3 }])).toBe(false);
    expect(isTakes({})).toBe(false);
  });

  it('rebuilds settings from saved data', () => {
    expect(sanitizeSettings({ chords: ['C', 'X'], seconds: 45, count: 'tap' })).toEqual({
      chords: ['C'],
      seconds: 60,
      count: 'tap',
    });
  });
});
