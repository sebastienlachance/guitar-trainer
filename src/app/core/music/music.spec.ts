import { ChordQuality, chordSymbol, spellChord } from './chords';
import { IntervalName, intervalFromSemitones, intervalLongName } from './intervals';
import { displayNoteName, midiToName, noteName, parseNote, pitchClassOf } from './notes';
import { scaleNameInText, scaleRootName, scaleTypeById } from './scales';
import { closeVoicing, dropTwo, inversionOf, voicingFor } from './voicings';

function quality(id: string, symbol: string, intervals: IntervalName[]): ChordQuality {
  return { id, symbol, name: id, intervals };
}

function spelled(root: string, intervals: IntervalName[]): string {
  return spellChord(parseNote(root), quality('test', '', intervals))
    .map((tone) => noteName(tone.note))
    .join(' ');
}

describe('notes', () => {
  it('parses and formats spelled notes', () => {
    expect(noteName(parseNote('Bb'))).toBe('Bb');
    expect(displayNoteName(parseNote('F#'))).toBe('F♯');
    expect(pitchClassOf(parseNote('Cb'))).toBe(11);
    expect(pitchClassOf(parseNote('B#'))).toBe(0);
  });

  it('rejects text that is not a note', () => {
    expect(() => parseNote('H')).toThrow();
  });

  it('names MIDI notes with their octave', () => {
    expect(midiToName(40)).toBe('E2');
    expect(midiToName(60)).toBe('C4');
    expect(midiToName(61)).toBe('C#4');
  });
});

describe('spellChord', () => {
  it.each([
    ['C', ['1', '4', '5'], 'C F G'],
    ['C', ['1', '2', '5'], 'C D G'],
    ['Bb', ['1', '3', '5', 'b7'], 'Bb D F Ab'],
    ['Eb', ['1', 'b3', 'b5', 'bb7'], 'Eb Gb Bbb Dbb'],
    ['F#', ['1', 'b3', 'b5', 'b7'], 'F# A C E'],
    ['Db', ['1', '3', '5', '6'], 'Db F Ab Bb'],
    ['F#', ['1', '3', '5', '7'], 'F# A# C# E#'],
    ['Ab', ['1', '3', '#5'], 'Ab C E'],
  ] as const)('spells %s with %j as %s', (root, intervals, expected) => {
    expect(spelled(root, [...intervals])).toBe(expected);
  });

  it('builds a display symbol from root and quality', () => {
    expect(chordSymbol(parseNote('Bb'), quality('m7b5', 'm7♭5', []))).toBe('B♭m7♭5');
  });
});

describe('voicings', () => {
  const major7: IntervalName[] = ['1', '3', '5', '7'];

  it('stacks close voicings within an octave for each inversion', () => {
    expect(closeVoicing(['1', '3', '5'], 0)).toEqual({
      tones: ['1', '3', '5'],
      offsets: [0, 4, 7],
    });
    expect(closeVoicing(['1', '3', '5'], 1)).toEqual({
      tones: ['3', '5', '1'],
      offsets: [0, 3, 8],
    });
    expect(closeVoicing(['1', '4', '5'], 2)).toEqual({
      tones: ['5', '1', '4'],
      offsets: [0, 5, 10],
    });
  });

  it('drops the second-highest voice an octave', () => {
    // Close G B C E becomes C G B E.
    expect(dropTwo(closeVoicing(major7, 2))).toEqual({
      tones: ['1', '5', '7', '3'],
      offsets: [0, 7, 11, 16],
    });
  });

  it('names drop 2 voicings after the bass tone', () => {
    for (let inversion = 0; inversion < 4; inversion++) {
      expect(inversionOf(voicingFor(major7, 'drop2', inversion), major7)).toBe(inversion);
    }
    expect(voicingFor(major7, 'drop2', 0).tones).toEqual(['1', '5', '7', '3']);
  });
});

describe('intervals', () => {
  it('names intervals in words', () => {
    expect(intervalLongName('b3')).toBe('minor 3rd');
    expect(intervalLongName('5')).toBe('perfect 5th');
    expect(intervalLongName('#4')).toBe('augmented 4th');
  });

  it('spells a distance above the root the usual way, octaves ignored', () => {
    expect(intervalFromSemitones(0)).toBe('1');
    expect(intervalFromSemitones(6)).toBe('b5');
    expect(intervalFromSemitones(8)).toBe('b6');
    expect(intervalFromSemitones(15)).toBe('b3');
  });
});

describe('scales', () => {
  it('writes scale names as they read in a sentence', () => {
    expect(scaleNameInText(scaleTypeById('minor-pentatonic')!)).toBe('minor pentatonic');
    expect(scaleNameInText(scaleTypeById('dorian')!)).toBe('Dorian');
  });

  it('spells the root as the key is usually written', () => {
    const scale = (id: string) => scaleTypeById(id)!;

    expect(scaleRootName(scale('major'), 8)).toBe('A♭');
    expect(scaleRootName(scale('minor-pentatonic'), 8)).toBe('G♯');
    expect(scaleRootName(scale('dorian'), 1)).toBe('C♯');
    expect(scaleRootName(scale('lydian'), 1)).toBe('D♭');
  });
});
