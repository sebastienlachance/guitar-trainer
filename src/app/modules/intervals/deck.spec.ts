import { SCALE_TYPES } from '../../core/music/scales';
import {
  IntervalCard,
  buildDeck,
  cardFromKey,
  describe as describeCard,
  findTargets,
  intervalAt,
  questionFor,
  rootFrets,
  scaleLabel,
  settingsProblems,
} from './deck';
import { DEFAULT_SETTINGS, IntervalsSettings } from './settings';

function settings(changes: Partial<IntervalsSettings> = {}): IntervalsSettings {
  return { ...DEFAULT_SETTINGS, ...changes };
}

function card(key: string): IntervalCard {
  const found = cardFromKey(key);
  if (!found) {
    throw new Error(`No card ${key}`);
  }
  return found;
}

/** With 12 frets, the first root fret is 2: F♯ on string 6, B on string 5. */
const firstRoot = () => 0;

const ALL_SCALES = SCALE_TYPES.map((scale) => scale.id);

describe('buildDeck', () => {
  it('has a card per task, scale, root string and interval, but not the root', () => {
    const deck = buildDeck(DEFAULT_SETTINGS);

    // 2 tasks × (6 major + 4 minor pentatonic intervals) × 2 root strings.
    expect(deck).toHaveLength(40);
    expect(deck[0].key).toBe('find|major|6|2');
    expect(deck.map((item) => item.key)).not.toContain('find|major|6|1');
  });

  it('keeps the catalog order whatever order you chose things in', () => {
    const deck = buildDeck(
      settings({ tasks: ['name', 'find'], rootStrings: [5, 6], scales: ['minor-pentatonic'] }),
    );

    expect(deck[0].key).toBe('find|minor-pentatonic|6|b3');
  });
});

describe('settingsProblems', () => {
  it('needs a task, a scale and a root string', () => {
    expect(settingsProblems(DEFAULT_SETTINGS)).toEqual([]);
    expect(settingsProblems(settings({ tasks: [], scales: [], rootStrings: [] }))).toEqual([
      'Pick Find, Name or both.',
      'Pick at least one scale.',
      'Pick at least one string for the root.',
    ]);
  });
});

describe('cardFromKey', () => {
  it('rebuilds every card of the deck', () => {
    for (const item of buildDeck(settings({ scales: ALL_SCALES }))) {
      expect(cardFromKey(item.key)).toEqual(item);
    }
  });

  it('rejects keys it does not know', () => {
    for (const key of [
      'find|major|6|1',
      'find|major|6|b3',
      'find|major|4|3',
      'play|major|6|3',
      'find|bebop|6|3',
      'find|major|6',
    ]) {
      expect(cardFromKey(key), key).toBeUndefined();
    }
  });

  it('describes a card for the stats page', () => {
    expect(describeCard(card('name|dorian|5|6'))).toEqual({
      title: '6 in Dorian',
      detail: 'Name, root on string 5',
    });
    expect(describeCard(card('find|minor-pentatonic|6|b3')).title).toBe('♭3 in minor pentatonic');
  });
});

describe('rootFrets', () => {
  it('keeps the position inside the fret range and away from the nut', () => {
    expect(rootFrets(12)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(rootFrets(15).at(-1)).toBe(12);
  });
});

describe('questionFor', () => {
  it('puts the root on the card’s string, with the position starting a fret below it', () => {
    const minorPentatonic = card('find|minor-pentatonic|6|b3');
    const question = questionFor(minorPentatonic, 12, firstRoot);

    expect(scaleLabel(minorPentatonic, question)).toBe('F♯ minor pentatonic');
    expect(question.start).toBe(1);
    expect(question.notes).toContainEqual({ string: 6, fret: 2, midi: 42, tone: '1' });
    expect(
      scaleLabel(card('find|major|5|3'), questionFor(card('find|major|5|3'), 12, firstRoot)),
    ).toBe('B major');
  });

  it('finds every interval of every scale in every position', () => {
    const frets = rootFrets(15);
    for (const item of buildDeck(settings({ tasks: ['name'], scales: ALL_SCALES }))) {
      frets.forEach((_, index) => {
        const question = questionFor(item, 15, () => (index + 0.5) / frets.length);

        expect(question.marked?.tone, item.key).toBe(item.interval);
        expect(
          question.notes.every(
            (note) => note.fret >= question.start && note.fret <= question.start + 4,
          ),
        ).toBe(true);
      });
    }
  });
});

describe('findTargets', () => {
  it('accepts every place in the position with the interval', () => {
    const minorThird = card('find|minor-pentatonic|6|b3');

    const targets = findTargets(minorThird, questionFor(minorThird, 12, firstRoot));

    expect(targets).toEqual([
      { string: 1, fret: 5, midi: 69 },
      { string: 3, fret: 2, midi: 57 },
      { string: 6, fret: 5, midi: 45 },
    ]);
  });

  it('includes other fingerings of the same pitch than the shape uses', () => {
    const flatFive = card('find|blues|6|b5');
    const question = questionFor(flatFive, 12, firstRoot);

    // C4 is on string 2, fret 1 in the shape; string 3, fret 5 is the same pitch.
    expect(question.notes).toContainEqual({ string: 2, fret: 1, midi: 60, tone: 'b5' });
    expect(question.notes).not.toContainEqual(expect.objectContaining({ string: 3, fret: 5 }));
    expect(findTargets(flatFive, question)).toContainEqual({ string: 3, fret: 5, midi: 60 });
  });
});

describe('intervalAt', () => {
  it('spells notes as the scale does, and others the usual way', () => {
    const c = { string: 2, fret: 1 }; // C, six semitones above F♯
    const g = { string: 1, fret: 3 }; // G, one semitone above F♯
    const at = (key: string, position: { string: number; fret: number }) =>
      intervalAt(card(key), questionFor(card(key), 12, firstRoot), position);

    expect(at('find|lydian|6|#4', c)).toBe('#4');
    expect(at('find|blues|6|b5', c)).toBe('b5');
    expect(at('find|minor-pentatonic|6|b3', c)).toBe('b5');
    expect(at('find|major|6|3', g)).toBe('b2');
  });
});
