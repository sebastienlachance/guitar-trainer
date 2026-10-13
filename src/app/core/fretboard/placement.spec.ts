import { IntervalName } from '../music/intervals';
import { voicingFor } from '../music/voicings';
import { MAX_SPAN, fretSpan, findChordTones, placeVoicing } from './placement';
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
