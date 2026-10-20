import { STANDARD_TUNING } from '../../core/fretboard/tuning';
import { mod } from '../../core/music/notes';
import {
  EAR_INTERVALS,
  MelodyCard,
  PlaybackCard,
  buildDeck,
  cardFromKey,
  degrees,
  heardPhrase,
  phraseFor,
  playPositions,
  settingsProblems,
  startPosition,
} from './deck';
import { DEFAULT_SETTINGS, INTERVAL_IDS, PlaybackSettings } from './settings';

/** The same "random" numbers every run. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function settings(changes: Partial<PlaybackSettings>): PlaybackSettings {
  return { ...DEFAULT_SETTINGS, ...changes };
}

const MAJOR_THIRD_UP = cardFromKey('interval:M3:up')!;
const FOURTH_DOWN = cardFromKey('interval:P4:down')!;
const PENTATONIC_4 = cardFromKey('melody:major-pentatonic:4') as MelodyCard;
const MAJOR_3 = cardFromKey('melody:major:3') as MelodyCard;

describe('play it back deck', () => {
  it('offers the intervals settings can name', () => {
    expect(EAR_INTERVALS.map((interval) => interval.id)).toEqual(INTERVAL_IDS);
  });

  it('makes a card per interval and direction, and per kind of melody', () => {
    const deck = buildDeck(
      settings({
        kinds: ['interval', 'melody'],
        intervals: ['P5', 'M3'],
        direction: 'both',
        scales: ['major-pentatonic'],
        melodyLength: 4,
      }),
    );

    expect(deck.map((card) => card.key)).toEqual([
      'interval:M3:up',
      'interval:M3:down',
      'interval:P5:up',
      'interval:P5:down',
      'melody:major-pentatonic:4',
    ]);
    deck.forEach((card) => expect(cardFromKey(card.key)).toEqual(card));
  });

  it('says what is missing before a session can start', () => {
    expect(settingsProblems(settings({ kinds: [] }))).toEqual([
      'Pick intervals, melodies or both.',
    ]);
    expect(settingsProblems(settings({ kinds: ['interval'], intervals: [] }))).toEqual([
      'Pick at least one interval.',
    ]);
    expect(settingsProblems(settings({ kinds: ['melody'], scales: [] }))).toEqual([
      'Pick at least one scale for the melodies.',
    ]);
    expect(settingsProblems(DEFAULT_SETTINGS)).toEqual([]);
  });

  it('ignores card keys this version does not know', () => {
    expect(cardFromKey('interval:M9:up')).toBeUndefined();
    expect(cardFromKey('interval:M3:sideways')).toBeUndefined();
    expect(cardFromKey('melody:major:7')).toBeUndefined();
  });

  it('finds a first note within the first frets, as low on the neck as it goes', () => {
    expect(startPosition(45)).toEqual({ string: 5, fret: 0 }); // A2
    expect(startPosition(43)).toEqual({ string: 6, fret: 3 }); // G2
    expect(startPosition(69)).toEqual({ string: 1, fret: 5 }); // A4
    expect(startPosition(70)).toBeNull();
  });

  it('plays an interval from a first note in the first frets', () => {
    expect(phraseFor(MAJOR_THIRD_UP, () => 0)).toEqual({
      notes: [40, 44],
      start: { string: 6, fret: 0 },
      root: null,
    });
    expect(phraseFor(FOURTH_DOWN, () => 0).notes).toEqual([45, 40]);
  });

  it.each([
    ['an interval up', MAJOR_THIRD_UP],
    ['an interval down', FOURTH_DOWN],
    ['a melody', PENTATONIC_4],
    ['a melody in a major scale', MAJOR_3],
  ])('keeps %s on the neck, starting where it says', (_kind, card: PlaybackCard) => {
    const random = seeded(3);
    for (let round = 0; round < 200; round++) {
      const phrase = phraseFor(card, random);

      phrase.notes.forEach((midi) => expect(midi).toBeGreaterThanOrEqual(40));
      phrase.notes.forEach((midi) => expect(midi).toBeLessThanOrEqual(76));
      const { string, fret } = phrase.start;
      expect(STANDARD_TUNING[string - 1] + fret).toBe(phrase.notes[0]);
      expect(fret).toBeLessThanOrEqual(5);
    }
  });

  it('makes melodies from the scale, from its root, within an octave and without repeats', () => {
    const random = seeded(11);
    for (let round = 0; round < 200; round++) {
      const phrase = phraseFor(PENTATONIC_4, random);
      const root = phrase.root!;

      expect(phrase.notes).toHaveLength(4);
      expect(mod(phrase.notes[0] - root, 12)).toBe(0);
      phrase.notes.forEach((midi) => {
        expect([0, 2, 4, 7, 9]).toContain(mod(midi - root, 12));
        expect(Math.abs(midi - phrase.notes[0])).toBeLessThanOrEqual(12);
      });
      phrase.notes.slice(1).forEach((midi, index) => expect(midi).not.toBe(phrase.notes[index]));
    }
  });

  it('keeps a melody within an octave even when it keeps leaping up', () => {
    // C major pentatonic from C3, then a leap up each time: C3 E3 A3, and D4 would be too far.
    const picks = [0, 0, 0.7, 0.7, 0.7];
    const phrase = phraseFor(PENTATONIC_4, () => picks.shift() ?? 0.7);

    expect(phrase.notes.slice(0, 3)).toEqual([48, 52, 57]);
    phrase.notes.forEach((midi) => expect(midi - 48).toBeLessThanOrEqual(12));
  });

  it('names a melody by its scale degrees', () => {
    expect(degrees({ notes: [43, 45, 47, 50], start: { string: 6, fret: 3 }, root: 7 })).toEqual([
      '1',
      '2',
      '3',
      '5',
    ]);
  });

  it('hears the phrase only when the last notes match, in order and octave', () => {
    expect(heardPhrase([52, 40, 44], [40, 44])).toBe(true);
    expect(heardPhrase([44, 40], [40, 44])).toBe(false);
    expect(heardPhrase([40, 56], [40, 44])).toBe(false);
    expect(heardPhrase([44], [40, 44])).toBe(false);
  });

  it('shows a way to play the phrase near its first note', () => {
    const phrase = { notes: [43, 45, 47, 50], start: { string: 6, fret: 3 }, root: 7 };

    const positions = playPositions(phrase);

    expect(positions[0]).toEqual(phrase.start);
    positions.forEach((position, index) =>
      expect(STANDARD_TUNING[position.string - 1] + position.fret).toBe(phrase.notes[index]),
    );
    positions.forEach((position) => expect(position.fret).toBeLessThanOrEqual(5));
  });
});
