import { CIRCLE_OF_FOURTHS, circleNoteName, clockPosition, nextOnCircle } from './circle';
import { parseNote, pitchClassOf } from './notes';

const pitchClass = (name: string) => pitchClassOf(parseNote(name));

describe('circle of fifths', () => {
  it('goes round in fourths as it is recited', () => {
    expect(CIRCLE_OF_FOURTHS.map(circleNoteName)).toEqual([
      'C',
      'F',
      'Bb',
      'Eb',
      'Ab',
      'Db',
      'Gb',
      'B',
      'E',
      'A',
      'D',
      'G',
    ]);
  });

  it('steps a fourth or a fifth up, wrapping round', () => {
    expect(circleNoteName(nextOnCircle(pitchClass('Eb'), 'fourths'))).toBe('Ab');
    expect(circleNoteName(nextOnCircle(pitchClass('Gb'), 'fourths'))).toBe('B');
    expect(circleNoteName(nextOnCircle(pitchClass('G'), 'fourths'))).toBe('C');
    expect(circleNoteName(nextOnCircle(pitchClass('C'), 'fifths'))).toBe('G');
    expect(circleNoteName(nextOnCircle(pitchClass('B'), 'fifths'))).toBe('Gb');
    expect(circleNoteName(nextOnCircle(pitchClass('F'), 'fifths'))).toBe('C');
  });

  it('places fifths clockwise from C at the top', () => {
    expect(clockPosition(pitchClass('C'))).toBe(0);
    expect(clockPosition(pitchClass('G'))).toBe(1);
    expect(clockPosition(pitchClass('Gb'))).toBe(6);
    expect(clockPosition(pitchClass('F'))).toBe(11);
  });
});
