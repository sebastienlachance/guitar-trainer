import { IntervalName } from '../music/intervals';
import { voicingFor } from '../music/voicings';
import {
  MAX_SPAN,
  fretSpan,
  findChordTones,
  placeVoicing,
  positionStarts,
  scaleInPosition,
} from './placement';
import { stringSetById } from './tuning';

function frets(
  intervals: IntervalName[],
  style: 'close' | 'drop2',
  inversion: number,
  bassPitchClass: number,
  setId: string,
) {
  const voicing = voicingFor(intervals, style, inversion);
  const strings = stringSetById(setId)!.strings;
  return placeVoicing(voicing, bassPitchClass, strings).map((notes) =>
    notes.map((note) => note.fret),
  );
}

describe('placeVoicing', () => {
  const C = 0;
  const F = 5;

  it('places C major root position on strings 1-2-3', () => {
    // G string fret 5 (C), B string fret 5 (E), high E fret 3 (G)
    expect(frets(['1', '3', '5'], 'close', 0, C, '1-2-3')).toContainEqual([5, 5, 3]);
  });

  it('places Cmaj7 drop 2 root position on strings 1-2-3-4', () => {
    expect(frets(['1', '3', '5', '7'], 'drop2', 0, C, '1-2-3-4')).toEqual([[10, 12, 12, 12]]);
  });

  it('places Csus4 root position on strings 2-3-4', () => {
    expect(frets(['1', '4', '5'], 'close', 0, C, '2-3-4')).toEqual([[10, 10, 8]]);
  });

  it('accounts for the major third between the G and B strings', () => {
    // Csus4 1st inversion (F G C) with F on the D string at fret 3: G is open, C is fret 1.
    expect(frets(['1', '4', '5'], 'close', 1, F, '2-3-4')).toContainEqual([3, 0, 1]);
  });

  it('keeps every shape on the neck and within a hand span', () => {
    const voicing = voicingFor(['1', 'b3', 'b5', 'bb7'], 'drop2', 3);
    for (let bass = 0; bass < 12; bass++) {
      for (const notes of placeVoicing(voicing, bass, stringSetById('3-4-5-6')!.strings)) {
        expect(fretSpan(notes)).toBeLessThanOrEqual(MAX_SPAN);
        expect(notes.every((note) => note.fret >= 0 && note.fret <= 15)).toBe(true);
      }
    }
  });

  it('refuses a string set that does not match the number of voices', () => {
    expect(() => frets(['1', '3', '5'], 'close', 0, C, '1-2-3-4')).toThrow();
  });
});

describe('findChordTones', () => {
  it('finds every chord tone on the low E string up to fret 15', () => {
    const lowE = findChordTones(0, ['1', '4', '5']).filter((note) => note.string === 6);
    expect(lowE.map((note) => [note.fret, note.tone])).toEqual([
      [1, '4'],
      [3, '5'],
      [8, '1'],
      [13, '4'],
      [15, '5'],
    ]);
  });
});

describe('scaleInPosition', () => {
  const A = 9;
  const C = 0;
  const minorPentatonic: IntervalName[] = ['1', 'b3', '4', '5', 'b7'];

  it('gives the familiar A minor pentatonic box at the 5th fret', () => {
    const frets = (string: number) =>
      scaleInPosition(A, minorPentatonic, 4)
        .filter((note) => note.string === string)
        .map((note) => note.fret);
    expect([6, 5, 4, 3, 2, 1].map(frets)).toEqual([
      [5, 8],
      [5, 7],
      [5, 7],
      [5, 7],
      [5, 8],
      [5, 8],
    ]);
  });

  it('plays each pitch once, within reach of the hand', () => {
    const major: IntervalName[] = ['1', '2', '3', '4', '5', '6', '7'];
    for (const start of [0, 2, 7]) {
      const notes = scaleInPosition(C, major, start);
      expect(new Set(notes.map((note) => note.midi)).size).toBe(notes.length);
      expect(notes.every((note) => note.fret >= start && note.fret <= start + 4)).toBe(true);
      // Two octaves and more: every degree is there.
      expect(new Set(notes.map((note) => note.tone)).size).toBe(7);
    }
  });
});

describe('positionStarts', () => {
  it('starts one position per root on the two bass strings, within the fret range', () => {
    // A: open 5th string, and 5th fret of the 6th string (12th fret of the 5th is too high).
    expect(positionStarts(9, 12)).toEqual([0, 4]);
    // C: 3rd fret of the 5th string, 8th fret of the 6th string.
    expect(positionStarts(0, 12)).toEqual([2, 7]);
    // Up to fret 15, C on the 15th fret of the 5th string would still run past the range.
    expect(positionStarts(0, 15)).toEqual([2, 7]);
  });
});
