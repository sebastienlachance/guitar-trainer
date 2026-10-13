import { parseNote } from '../../core/music/notes';
import { qualityById, shellIntervals } from './catalog';
import {
  buildDeck,
  cardFromKey,
  cardTitle,
  chordTarget,
  settingsProblems,
  shapeKindsFor,
  shapeLabel,
  shapesFor,
} from './deck';
import { DEFAULT_SETTINGS, TriadSettings, sanitizeSettings, toggleIn } from './settings';

const settings = (overrides: Partial<TriadSettings>): TriadSettings => ({
  ...DEFAULT_SETTINGS,
  ...overrides,
});

const quality = (id: string) => qualityById(id)!;

describe('catalog', () => {
  it('builds shells by leaving out a perfect 5th only', () => {
    expect(shellIntervals(quality('7'))).toEqual(['1', '3', 'b7']);
    expect(shellIntervals(quality('6'))).toEqual(['1', '3', '6']);
    expect(shellIntervals(quality('m7b5'))).toBeNull();
    expect(shellIntervals(quality('sus4'))).toBeNull();
  });
});

describe('shapes', () => {
  it('uses triad shapes for three-note chords whatever the four-note preference', () => {
    expect(shapeKindsFor(quality('sus2'), 'drop2')).toEqual(['triad']);
  });

  it('follows the four-note preference', () => {
    expect(shapeKindsFor(quality('m7'), 'both')).toEqual(['shell', 'drop2']);
    expect(shapeKindsFor(quality('m7'), 'shell')).toEqual(['shell']);
    expect(shapeKindsFor(quality('m7'), 'drop2')).toEqual(['drop2']);
  });

  it('keeps drop 2 for chords that have no shell', () => {
    expect(shapeKindsFor(quality('dim7'), 'shell')).toEqual(['drop2']);
  });

  it('pairs each kind with string sets of the right size and valid inversions', () => {
    const shapes = shapesFor(quality('7'), settings({ stringSets: ['2-3-4', '1-2-3-4'] }));
    expect(shapes.map(shapeLabel)).toEqual([
      'Shell · Root position · strings 2-3-4',
      'Shell · 1st inversion · strings 2-3-4',
      'Shell · 2nd inversion · strings 2-3-4',
      'Drop 2 · Root position · strings 1-2-3-4',
      'Drop 2 · 1st inversion · strings 1-2-3-4',
      'Drop 2 · 2nd inversion · strings 1-2-3-4',
      'Drop 2 · 3rd inversion · strings 1-2-3-4',
    ]);
  });
});

describe('buildDeck', () => {
  it('makes one card per root and chord type when asking for chords only', () => {
    const deck = buildDeck(settings({ qualities: ['sus2', 'sus4'], roots: ['C', 'Bb'] }));
    expect(deck.map(cardTitle)).toEqual(['Csus2', 'Csus4', 'B♭sus2', 'B♭sus4']);
    expect(deck.every((card) => card.shape === null)).toBe(true);
  });

  it('makes one card per playable shape when asking for shapes', () => {
    const deck = buildDeck(
      settings({ qualities: ['sus4'], roots: ['C'], promptDetail: 'shape', inversions: [0, 1, 2] }),
    );
    // 4 three-string sets x 3 inversions; four-string sets don't apply to triads.
    expect(deck).toHaveLength(12);
    expect(deck[0].key).toBe('C|sus4|triad|1-2-3|0');
  });
});

describe('cardFromKey', () => {
  it('round-trips card keys', () => {
    const [card] = buildDeck(
      settings({
        qualities: ['7'],
        roots: ['Bb'],
        promptDetail: 'shape',
        fourNoteVoicing: 'drop2',
      }),
    );
    expect(cardFromKey(card.key)).toEqual(card);
    expect(cardFromKey('C|sus4')).toEqual({
      key: 'C|sus4',
      root: parseNote('C'),
      quality: quality('sus4'),
      shape: null,
    });
  });

  it('ignores keys for chords that are no longer offered', () => {
    expect(cardFromKey('C|add9')).toBeUndefined();
    expect(cardFromKey('C|sus4|triad|9-9-9|0')).toBeUndefined();
  });
});

describe('chordTarget', () => {
  it('targets the chord pitch classes for chord-only cards', () => {
    expect(chordTarget(cardFromKey('C|sus4')!)).toEqual({
      kind: 'pitchClasses',
      pitchClasses: [0, 5, 7],
    });
  });

  it('targets the exact notes of each position for shape cards', () => {
    expect(chordTarget(cardFromKey('C|sus4|triad|2-3-4|0')!)).toEqual({
      kind: 'exact',
      positions: [[60, 65, 67]],
    });
  });
});

describe('settings', () => {
  it('reports what is missing before practice can start', () => {
    const empty = settings({ qualities: [], roots: [] });
    expect(settingsProblems(empty, buildDeck(empty))).toEqual([
      'Pick at least one chord type.',
      'Pick at least one root.',
    ]);
  });

  it('explains when no string set fits the chosen chords', () => {
    const drop2Only = settings({
      qualities: ['m7'],
      promptDetail: 'shape',
      fourNoteVoicing: 'drop2',
      stringSets: ['1-2-3'],
    });
    expect(settingsProblems(drop2Only, buildDeck(drop2Only))).toHaveLength(1);
  });

  it('keeps known saved values and drops the rest', () => {
    const restored = sanitizeSettings({
      qualities: ['sus4', 'add9', 'major'],
      promptDetail: 'everything',
      strumThreshold: 3,
      micMode: 'arpeggio',
    });
    expect(restored.qualities).toEqual(['major', 'sus4']);
    expect(restored.promptDetail).toBe(DEFAULT_SETTINGS.promptDetail);
    expect(restored.strumThreshold).toBe(DEFAULT_SETTINGS.strumThreshold);
    expect(restored.micMode).toBe('arpeggio');
    expect(sanitizeSettings('garbage')).toBe(DEFAULT_SETTINGS);
  });

  it('toggles values while keeping canonical order', () => {
    expect(toggleIn(['C', 'G'], 'D', ['C', 'D', 'E', 'G'])).toEqual(['C', 'D', 'G']);
    expect(toggleIn(['C', 'G'], 'C', ['C', 'D', 'E', 'G'])).toEqual(['G']);
  });
});
