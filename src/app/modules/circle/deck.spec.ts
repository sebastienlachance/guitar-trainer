import { parseNote, pitchClassOf } from '../../core/music/notes';
import {
  answersCard,
  buildDeck,
  cardFor,
  cardFromKey,
  describeCard,
  settingsProblems,
} from './deck';
import { DEFAULT_SETTINGS } from './settings';

const pitchClass = (name: string) => pitchClassOf(parseNote(name));

describe('circle deck', () => {
  it('asks every note in fourths by default', () => {
    const deck = buildDeck(DEFAULT_SETTINGS);

    expect(deck).toHaveLength(12);
    expect(deck.slice(0, 3).map((card) => card.key)).toEqual([
      'fourths|C',
      'fourths|F',
      'fourths|Bb',
    ]);
    expect(deck.find((card) => card.key === 'fourths|Gb')?.answer).toBe(pitchClass('B'));
  });

  it('asks each chosen note in each chosen direction', () => {
    const deck = buildDeck({
      ...DEFAULT_SETTINGS,
      directions: ['fourths', 'fifths'],
      notes: ['B'],
    });

    expect(deck.map((card) => card.key)).toEqual(['fourths|B', 'fifths|B']);
    expect(deck.map((card) => card.answer)).toEqual([pitchClass('E'), pitchClass('Gb')]);
  });

  it('says what is missing from the settings', () => {
    expect(settingsProblems(DEFAULT_SETTINGS)).toEqual([]);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, directions: [], notes: [] })).toEqual([
      'Pick a direction: fourths, fifths or both.',
      'Pick at least one note to start from.',
    ]);
  });

  it('takes the answer played in any octave, and nothing else', () => {
    const card = cardFor('fourths', pitchClass('Eb'));

    // A♭2, A♭4
    expect(answersCard(card, 44)).toBe(true);
    expect(answersCard(card, 68)).toBe(true);
    // E♭3, the note asked about, and A3
    expect(answersCard(card, 51)).toBe(false);
    expect(answersCard(card, 57)).toBe(false);
  });

  it('rebuilds a card from its key, and describes it', () => {
    expect(cardFromKey('fifths|Db')).toEqual(cardFor('fifths', pitchClass('Db')));
    expect(cardFromKey('fourths|C#')).toBeUndefined();
    expect(cardFromKey('thirds|C')).toBeUndefined();
    expect(cardFromKey('fourths|C|1')).toBeUndefined();

    expect(describeCard('fourths|Eb')).toEqual({ title: 'E♭ → A♭', detail: 'in fourths' });
    expect(describeCard('fifths|B')).toEqual({ title: 'B → G♭', detail: 'in fifths' });
  });
});
