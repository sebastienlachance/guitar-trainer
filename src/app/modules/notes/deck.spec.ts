import { parseNote } from '../../core/music/notes';
import {
  NoteCard,
  allFound,
  buildDeck,
  cardFromKey,
  noteNameAt,
  settingsProblems,
  stringToPlay,
  targetsOf,
  whereLabel,
} from './deck';
import { DEFAULT_SETTINGS, NotesSettings, sanitizeSettings } from './settings';

const settings = (overrides: Partial<NotesSettings>): NotesSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

const card = (name: string, string: number | null): NoteCard => ({
  key: `${name}|${string ?? 'neck'}`,
  note: parseNote(name),
  string,
});

describe('targetsOf', () => {
  it('finds a note on one string, octave included', () => {
    const frets = targetsOf(card('A', 5), settings({ maxFret: 12 })).map((target) => target.fret);
    expect(frets).toEqual([0, 12]);
  });

  it('respects the fret range', () => {
    expect(targetsOf(card('F#', 5), settings({ maxFret: 5 }))).toEqual([]);
    expect(targetsOf(card('F#', 5), settings({ maxFret: 12 }))).toEqual([
      { string: 5, fret: 9, midi: 54 },
    ]);
  });

  it('finds every place on the chosen strings for a whole-neck card', () => {
    const targets = targetsOf(card('G', null), settings({ strings: [5, 6], maxFret: 12 }));
    expect(targets.map((target) => [target.string, target.fret])).toEqual([
      [5, 10],
      [6, 3],
    ]);
  });
});

describe('buildDeck', () => {
  it('asks for each note on each string', () => {
    const deck = buildDeck(settings({ notes: ['C', 'F#'], strings: [5, 6] }));
    expect(deck.map((note) => note.key)).toEqual(['C|5', 'C|6', 'F#|5', 'F#|6']);
  });

  it('asks for each note once on the whole neck', () => {
    const deck = buildDeck(settings({ notes: ['C', 'G'], promptKind: 'neck' }));
    expect(deck.map((note) => note.key)).toEqual(['C|neck', 'G|neck']);
  });

  it('leaves out notes that are not within the fret range', () => {
    const deck = buildDeck(settings({ notes: ['C', 'C#'], strings: [6], maxFret: 5 }));
    expect(deck.map((note) => note.key)).toEqual([]);
    expect(
      settingsProblems(settings({ notes: ['C', 'C#'], strings: [6], maxFret: 5 }), deck),
    ).toHaveLength(1);
  });

  it('says what is missing', () => {
    const empty = settings({ notes: [], strings: [] });
    expect(settingsProblems(empty, buildDeck(empty))).toEqual([
      'Pick at least one note.',
      'Pick at least one string.',
    ]);
  });
});

describe('answers', () => {
  const targets = [
    { string: 6, fret: 3, midi: 43 },
    { string: 4, fret: 5, midi: 55 },
  ];

  it('is complete once every target was picked, misses or not', () => {
    const firstHit = { position: { string: 6, fret: 3 }, hit: true };
    const miss = { position: { string: 5, fret: 8 }, hit: false };
    const secondHit = { position: { string: 4, fret: 5 }, hit: true };
    expect(allFound(targets, [firstHit, miss])).toBe(false);
    expect(allFound(targets, [firstHit, miss, secondHit])).toBe(true);
  });

  it('walks the strings from the lowest-sounding one with places left', () => {
    const lowG = { position: { string: 6, fret: 3 }, hit: true };
    const highG = { position: { string: 4, fret: 5 }, hit: true };
    expect(stringToPlay(targets, [])).toBe(6);
    expect(stringToPlay(targets, [lowG])).toBe(4);
    // Tapping places out of order is fine: the walk goes back to what's left.
    expect(stringToPlay(targets, [highG])).toBe(6);
    expect(stringToPlay(targets, [lowG, highG])).toBeNull();
  });

  it('names the note at any position', () => {
    expect(noteNameAt({ string: 5, fret: 7 })).toBe('E');
    expect(noteNameAt({ string: 5, fret: 9 })).toBe('F♯');
    expect(noteNameAt({ string: 3, fret: 3 })).toBe('B♭');
  });

  it('says where to look', () => {
    expect(whereLabel(card('F#', 5), DEFAULT_SETTINGS)).toBe('on string 5 (A)');
    expect(whereLabel(card('G', null), DEFAULT_SETTINGS)).toBe('everywhere');
    expect(whereLabel(card('G', null), settings({ strings: [4, 5] }))).toBe('on strings 4, 5');
  });
});

describe('saved data', () => {
  it('round-trips card keys and ignores unknown ones', () => {
    expect(cardFromKey('F#|5')).toEqual(card('F#', 5));
    expect(cardFromKey('G|neck')).toEqual(card('G', null));
    expect(cardFromKey('H|5')).toBeUndefined();
    expect(cardFromKey('C|9')).toBeUndefined();
  });

  it('keeps known settings and drops the rest', () => {
    const restored = sanitizeSettings({ notes: ['C', 'H'], maxFret: 7, promptKind: 'neck' });
    expect(restored.notes).toEqual(['C']);
    expect(restored.maxFret).toBe(DEFAULT_SETTINGS.maxFret);
    expect(restored.promptKind).toBe('neck');
  });
});
