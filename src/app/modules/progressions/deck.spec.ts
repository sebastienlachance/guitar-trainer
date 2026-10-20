import {
  PRESETS,
  SlotOutcome,
  buildDeck,
  cardFromKey,
  chordsText,
  isTakes,
  outcomeSummary,
  readProgression,
  settingsProblems,
  slotAt,
  slotOutcome,
  takePasses,
  takeSlots,
} from './deck';
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings';

describe('progressions deck', () => {
  it('offers ready-made progressions, named for what they are', () => {
    expect(PRESETS.map(chordsText)).toEqual([
      'G D Em C',
      'C G Am F',
      'Am F C G',
      'A D E A',
      'D A Bm G',
    ]);
    expect(PRESETS[0].name).toBe('I–V–vi–IV in G');
  });

  it('reads a progression you write, and says what is wrong with one it cannot read', () => {
    expect(readProgression('  E A  B7 A ').card?.key).toBe('E-A-B7-A');
    expect(readProgression('F# C#m').card?.chords.map((chord) => chord.name)).toEqual([
      'F♯',
      'C♯m',
    ]);
    expect(readProgression('G H7').problem).toBe(
      `"H7" isn't a chord the app knows: a root, then nothing, m, 7, maj7 or m7.`,
    );
    expect(readProgression('G').problem).toBe('A progression needs at least two chords.');
    expect(readProgression('C D E F G A B C D').problem).toBe('Up to 8 chords.');
  });

  it('makes a card of each progression picked, and of yours unless it is one of them', () => {
    const deck = (custom: string) =>
      buildDeck({ ...DEFAULT_SETTINGS, presets: ['G-D-Em-C'], custom }).map((card) => card.key);

    expect(deck('E A B7 A')).toEqual(['G-D-Em-C', 'E-A-B7-A']);
    expect(deck('G D Em C')).toEqual(['G-D-Em-C']);
    expect(deck('G H')).toEqual(['G-D-Em-C']);
    expect(cardFromKey('E-A-B7-A')?.name).toBeNull();
    expect(cardFromKey('C-G-Am-F')?.name).toBe('I–V–vi–IV in C');
    expect(settingsProblems([])).toEqual(['Pick a progression, or write your own.']);
  });

  it('lays out the chords of a take, twice through', () => {
    const slots = takeSlots(cardFromKey('C-G')!, 10, 0.5, 4);

    expect(slots.map((slot) => `${slot.chord.name}@${slot.time}`)).toEqual([
      'C@10',
      'G@12',
      'C@14',
      'G@16',
    ]);
  });

  it('gives a strike to the chord whose time it falls in, from a quarter beat early', () => {
    const slots = takeSlots(cardFromKey('C-G')!, 10, 0.5, 4);

    expect(slotAt(slots, 9.8, 0.5, 4)).toBe(-1);
    expect(slotAt(slots, 9.9, 0.5, 4)).toBe(0);
    expect(slotAt(slots, 11.8, 0.5, 4)).toBe(0);
    expect(slotAt(slots, 11.9, 0.5, 4)).toBe(1);
    expect(slotAt(slots, 17.9, 0.5, 4)).toBe(-1);
  });

  it('calls a chord on time up to half a beat after its beat, late after that', () => {
    const slot = { chord: cardFromKey('C-G')!.chords[0], time: 10 };

    expect(slotOutcome(slot, 9.9, 0.5)).toBe('on-time');
    expect(slotOutcome(slot, 10.25, 0.5)).toBe('on-time');
    expect(slotOutcome(slot, 10.3, 0.5)).toBe('late');
    expect(slotOutcome(slot, null, 0.5)).toBe('missed');
  });

  it('passes a take with 7 chords in 8 on time', () => {
    const take = (onTime: number): SlotOutcome[] =>
      Array.from({ length: 8 }, (_, index) => (index < onTime ? 'on-time' : 'late'));

    expect(takePasses(take(7))).toBe(true);
    expect(takePasses(take(6))).toBe(false);
    expect(outcomeSummary(['on-time', 'late', 'missed', 'on-time'])).toBe(
      '2 of 4 chords on the beat · 1 late · 1 missed',
    );
  });

  it('keeps only well-formed takes and settings from storage', () => {
    const take = { progression: 'G-D-Em-C', bpm: 70, at: 1, onTime: 7, total: 8, passed: true };

    expect(isTakes([take])).toBe(true);
    expect(isTakes([{ ...take, onTime: '7' }])).toBe(false);
    expect(sanitizeSettings({ presets: ['G-D-Em-C', 'X'], custom: 42, beatsPerChord: 3 })).toEqual({
      ...DEFAULT_SETTINGS,
      presets: ['G-D-Em-C'],
    });
  });
});
