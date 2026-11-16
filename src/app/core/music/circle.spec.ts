import {
  CIRCLE_OF_FOURTHS,
  KEY_SIGNATURES,
  circleNoteName,
  clockPosition,
  keySignature,
  majorKeyWith,
  minorKeyLabel,
  nextOnCircle,
  relativeMinor,
  signatureLabel,
  signatureWords,
} from './circle';
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

  it('jumps several steps at once', () => {
    expect(circleNoteName(nextOnCircle(pitchClass('Eb'), 'fourths', 2))).toBe('Db');
    expect(circleNoteName(nextOnCircle(pitchClass('Eb'), 'fourths', 3))).toBe('Gb');
    expect(circleNoteName(nextOnCircle(pitchClass('A'), 'fifths', 3))).toBe('Gb');
  });

  it('counts the sharps and flats of each major key', () => {
    const signatures = CIRCLE_OF_FOURTHS.map((key) => keySignature(key));
    // C F B♭ E♭ A♭ D♭ G♭ B E A D G
    expect(signatures).toEqual([0, -1, -2, -3, -4, -5, -6, 5, 4, 3, 2, 1]);
    expect(KEY_SIGNATURES.map(majorKeyWith).map(keySignature)).toEqual(KEY_SIGNATURES);
    expect(circleNoteName(majorKeyWith(3))).toBe('A');
    expect(circleNoteName(majorKeyWith(-4))).toBe('Ab');
  });

  it('names signatures', () => {
    expect(signatureLabel(0)).toBe('No ♯ or ♭');
    expect(signatureLabel(3)).toBe('3♯');
    expect(signatureLabel(-4)).toBe('4♭');
    expect(signatureWords(0)).toBe('no sharps or flats');
    expect(signatureWords(1)).toBe('1 sharp');
    expect(signatureWords(-6)).toBe('6 flats');
  });

  it('finds relative minors, spelled from their signatures', () => {
    expect(minorKeyLabel(relativeMinor(pitchClass('Eb')))).toBe('Cm');
    expect(minorKeyLabel(relativeMinor(pitchClass('B')))).toBe('G♯m');
    expect(minorKeyLabel(relativeMinor(pitchClass('Gb')))).toBe('E♭m');
    expect(minorKeyLabel(relativeMinor(pitchClass('A')))).toBe('F♯m');
  });
});
