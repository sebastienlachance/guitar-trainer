import { parseNote, pitchClassOf } from '../../core/music/notes';
import {
  GRID_ROWS,
  StepCard,
  answerOptions,
  answersCard,
  buildDeck,
  cardFromKey,
  describeCard,
  keyCard,
  neckSpot,
  nextSpot,
  promptOf,
  settingsProblems,
  shapeHint,
  stepCard,
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
    const card = stepCard('next', 'fourths', pitchClass('Eb'));

    // A♭2, A♭4
    expect(answersCard(card, 44)).toBe(true);
    expect(answersCard(card, 68)).toBe(true);
    // E♭3, the note asked about, and A3
    expect(answersCard(card, 51)).toBe(false);
    expect(answersCard(card, 57)).toBe(false);
  });

  it('rebuilds a card from its key, and describes it', () => {
    expect(cardFromKey('fifths|Db')).toEqual(stepCard('next', 'fifths', pitchClass('Db')));
    expect(cardFromKey('fourths|C#')).toBeUndefined();
    expect(cardFromKey('thirds|C')).toBeUndefined();
    expect(cardFromKey('fourths|C|1')).toBeUndefined();

    expect(describeCard('fourths|Eb')).toEqual({ title: 'E♭ → A♭', detail: 'in fourths' });
    expect(describeCard('fifths|B')).toEqual({ title: 'B → G♭', detail: 'in fifths' });
  });

  it('asks a few steps round, keeping the key of one step as it was', () => {
    const deck = buildDeck({ ...DEFAULT_SETTINGS, steps: [1, 3], notes: ['Eb'] });

    expect(deck.map((card) => card.key)).toEqual(['fourths|Eb', 'fourths|Eb|3']);
    expect(deck.map((card) => card.answer)).toEqual([pitchClass('Ab'), pitchClass('Gb')]);
    expect(promptOf(deck[1])).toEqual({
      ask: 'What comes 3 steps after',
      subject: 'E♭',
      detail: 'in fourths',
    });
    expect(cardFromKey('fourths|Eb|3')).toEqual(deck[1]);
    expect(cardFromKey('fourths|Eb|4')).toBeUndefined();
    expect(describeCard('fourths|Eb|3')).toEqual({
      title: 'E♭ → G♭',
      detail: 'in fourths, 3 steps',
    });
  });

  it('goes through every note in laps, one step at a time, whichever note they start from', () => {
    const deck = buildDeck({ ...DEFAULT_SETTINGS, order: 'laps', steps: [3], notes: ['C'] });

    expect(deck).toHaveLength(12);
    expect(deck.every((card) => (card as StepCard).steps === 1)).toBe(true);
  });

  it('asks about keys: signatures, the key with a signature, and relative minors', () => {
    const deck = buildDeck({ ...DEFAULT_SETTINGS, exercise: 'keys', notes: ['Ab', 'B'] });

    expect(deck.map((card) => card.key)).toEqual([
      'signature|Ab',
      'signature|B',
      'key|Ab',
      'key|B',
      'relative|Ab',
      'relative|B',
    ]);
    expect(deck.map((card) => card.answer)).toEqual([
      -4,
      5,
      pitchClass('Ab'),
      pitchClass('B'),
      pitchClass('F'),
      pitchClass('G#'),
    ]);
    expect(deck.map((card) => `${promptOf(card).ask} ${promptOf(card).subject}`)).toEqual([
      'How many sharps or flats in A♭ major',
      'How many sharps or flats in B major',
      'Which major key has 4♭',
      'Which major key has 5♯',
      'What is the relative minor of A♭ major',
      'What is the relative minor of B major',
    ]);
    expect(deck.map((card) => cardFromKey(card.key))).toEqual(deck);
    expect(deck.map((card) => describeCard(card.key)?.title)).toEqual([
      'A♭ major: 4♭',
      'B major: 5♯',
      '4♭: A♭ major',
      '5♯: B major',
      'A♭ → Fm',
      'B → G♯m',
    ]);
  });

  it('offers notes, minor keys or signatures to answer with', () => {
    expect(answerOptions('note').map((option) => option.label)).toContain('G♭');
    expect(answerOptions('minor').map((option) => option.label)).toEqual([
      'Cm',
      'C♯m',
      'Dm',
      'E♭m',
      'Em',
      'Fm',
      'F♯m',
      'Gm',
      'G♯m',
      'Am',
      'B♭m',
      'Bm',
    ]);
    expect(answerOptions('signature').map((option) => option.label)).toEqual([
      '6♭',
      '5♭',
      '4♭',
      '3♭',
      '2♭',
      '1♭',
      'None',
      '1♯',
      '2♯',
      '3♯',
      '4♯',
      '5♯',
    ]);
  });

  it('takes a played root for a key or a relative minor, but never for a signature', () => {
    // C4
    expect(answersCard(keyCard('relative', pitchClass('Eb')), 60)).toBe(true);
    expect(answersCard(keyCard('key', pitchClass('C')), 60)).toBe(true);
    // C major's signature is 0, the same number as C's pitch class: playing C must not answer.
    expect(answersCard(keyCard('signature', pitchClass('C')), 60)).toBe(false);
  });

  it('says what each exercise is missing', () => {
    expect(
      settingsProblems({ ...DEFAULT_SETTINGS, exercise: 'keys', directions: [], keyQuestions: [] }),
    ).toEqual(['Pick at least one kind of question.']);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, steps: [] })).toEqual([
      'Pick how many steps round to ask.',
    ]);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, order: 'laps', steps: [] })).toEqual([]);
    expect(settingsProblems({ ...DEFAULT_SETTINGS, exercise: 'keys', notes: [] })).toEqual([
      'Pick at least one key.',
    ]);
  });

  describe('on the neck', () => {
    it('shows the note, fretted, on a string with a next string that way round', () => {
      const card = stepCard('neck', 'fourths', pitchClass('Ab'));
      const spots = Array.from({ length: 20 }, (_, index) => neckSpot(card, () => index / 20));

      expect(card.key).toBe('neck|fourths|Ab');
      expect(cardFromKey('neck|fourths|Ab')).toEqual(card);
      expect(spots.every((spot) => spot.string >= 2 && spot.fret >= 1 && spot.fret <= 10)).toBe(
        true,
      );
      // The first place is on the B string.
      expect(neckSpot(card, () => 0)).toEqual({ string: 2, fret: 9 });
    });

    it('reaches the next note at the same fret on the next string, a fret further across G and B', () => {
      // A♭ on the low E, fret 4: D♭ on the A string, fret 4.
      expect(nextSpot('fourths', { string: 6, fret: 4 })).toEqual({ string: 5, fret: 4 });
      // B♭ on the G string, fret 3: E♭ on the B string, fret 4.
      expect(nextSpot('fourths', { string: 3, fret: 3 })).toEqual({ string: 2, fret: 4 });
      // D on the A string, fret 5: A on the low E, fret 5.
      expect(nextSpot('fifths', { string: 5, fret: 5 })).toEqual({ string: 6, fret: 5 });
      // E♭ on the B string, fret 4: B♭ on the G string, fret 3.
      expect(nextSpot('fifths', { string: 2, fret: 4 })).toEqual({ string: 3, fret: 3 });

      expect(shapeHint('fourths', { string: 6, fret: 4 })).toBe(
        'Same fret on the next thinner string.',
      );
      expect(shapeHint('fifths', { string: 2, fret: 4 })).toMatch(/^One fret down/);
    });
  });

  it('has a stats row for each kind of question', () => {
    expect(GRID_ROWS.map((row) => row.id)).toEqual([
      'fourths|1',
      'fourths|2',
      'fourths|3',
      'fifths|1',
      'fifths|2',
      'fifths|3',
      'neck|fourths',
      'neck|fifths',
      'signature',
      'key',
      'relative',
    ]);
    expect(GRID_ROWS[0].keyFor(pitchClass('Eb'))).toBe('fourths|Eb');
  });
});
