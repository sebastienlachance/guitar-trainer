import { scaleTypeById } from '../../core/music/scales';
import { buildDeck, cardFromKey, notesOf, positionLabel, settingsProblems } from './deck';
import { DEFAULT_SETTINGS, ScalesSettings, sanitizeSettings } from './settings';

const settings = (overrides: Partial<ScalesSettings>): ScalesSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

describe('buildDeck', () => {
  it('asks about each chosen scale from every root, in each position', () => {
    const deck = buildDeck(settings({ scales: ['major', 'dorian'] }));
    // Up to the 12th fret: two positions for most roots, one for D, E♭, G and A♭, whose other
    // root is too high. 20 per scale.
    expect(deck).toHaveLength(2 * 20);
    expect(deck[0].key).toBe('major|C|2');
    expect(deck.every((card) => card.start + 4 <= 12)).toBe(true);
  });

  it('needs at least two scales to choose between', () => {
    expect(settingsProblems(settings({ scales: ['major'] }))).toHaveLength(1);
    expect(settingsProblems(settings({ scales: ['major', 'blues'] }))).toEqual([]);
  });
});

describe('a card', () => {
  const card = cardFromKey('minor-pentatonic|A|4')!;

  it('round-trips through its key, and ignores unknown keys', () => {
    expect(card.scale).toBe(scaleTypeById('minor-pentatonic'));
    expect(card.root).toBe(9);
    expect(card.start).toBe(4);
    expect(cardFromKey('bebop|A|4')).toBeUndefined();
    expect(cardFromKey('major|H|4')).toBeUndefined();
  });

  it('shows the scale in its position, with the root among the notes', () => {
    const notes = notesOf(card);
    expect(notes.filter((note) => note.tone === '1').length).toBeGreaterThanOrEqual(2);
    expect(positionLabel(card)).toBe('A root, frets 4–8');
  });
});

describe('settings', () => {
  it('keeps known values and drops the rest', () => {
    const restored = sanitizeSettings({ scales: ['dorian', 'bebop'], maxFret: 5 });
    expect(restored.scales).toEqual(['dorian']);
    expect(restored.maxFret).toBe(DEFAULT_SETTINGS.maxFret);
  });
});
