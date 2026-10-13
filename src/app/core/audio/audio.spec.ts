import { chordSimilarity, chromaFromSpectrum } from './chroma';
import { ChordTarget, matchesArpeggio, matchesStrum } from './matchers';
import { NoteStream, frequencyToMidi } from './note-stream';

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

describe('NoteStream', () => {
  const frame = (midi: number | null, time: number, level = 0.1) => ({
    frequency: midi === null ? 0 : hz(midi),
    clarity: midi === null ? 0 : 0.95,
    level,
    time,
  });

  function play(stream: NoteStream, frames: ReturnType<typeof frame>[]): number[] {
    return frames.map((f) => stream.push(f)).filter((note): note is number => note !== null);
  }

  it('converts frequencies to the nearest MIDI note', () => {
    expect(frequencyToMidi(440)).toBe(69);
    expect(frequencyToMidi(82.41)).toBe(40);
    expect(frequencyToMidi(452)).toBe(69); // under half a semitone sharp
  });

  it('reports a note once it has held steady', () => {
    const stream = new NoteStream();
    expect(play(stream, [frame(60, 0), frame(60, 50), frame(60, 100), frame(60, 150)])).toEqual([
      60,
    ]);
  });

  it('ignores pitches that do not hold long enough', () => {
    const stream = new NoteStream();
    expect(play(stream, [frame(60, 0), frame(62, 50), frame(64, 100)])).toEqual([]);
  });

  it('reports each note of an arpeggio in order', () => {
    const stream = new NoteStream();
    const frames = [60, 65, 67].flatMap((midi, i) => [
      frame(midi, i * 300),
      frame(midi, i * 300 + 120),
    ]);
    expect(play(stream, frames)).toEqual([60, 65, 67]);
  });

  it('counts a re-picked note again only after silence', () => {
    const stream = new NoteStream();
    const notes = play(stream, [
      frame(60, 0),
      frame(60, 120),
      frame(60, 400), // still ringing: same note, not reported again
      frame(null, 500, 0), // silence
      frame(60, 600),
      frame(60, 720),
    ]);
    expect(notes).toEqual([60, 60]);
  });
});

describe('chroma', () => {
  const sampleRate = 48000;
  const binHz = sampleRate / 16384;

  function spectrumWith(...midis: number[]): Float32Array {
    const spectrum = new Float32Array(8192).fill(-120);
    for (const midi of midis) {
      spectrum[Math.round(hz(midi) / binHz)] = 0;
    }
    return spectrum;
  }

  it('folds spectral peaks into pitch classes', () => {
    const chroma = chromaFromSpectrum(spectrumWith(48, 65, 67), sampleRate);
    expect(chroma[0]).toBeCloseTo(1);
    expect(chroma[5]).toBeCloseTo(1);
    expect(chroma[7]).toBeCloseTo(1);
    expect(chroma[4]).toBeLessThan(0.01);
  });

  it('scores the right chord above a neighbouring one', () => {
    const chroma = chromaFromSpectrum(spectrumWith(48, 65, 67), sampleRate);
    expect(chordSimilarity(chroma, [0, 5, 7])).toBeCloseTo(1);
    expect(chordSimilarity(chroma, [0, 4, 7])).toBeCloseTo(2 / 3);
  });

  it('matches a strum only when every chord tone is present', () => {
    const csus4 = chromaFromSpectrum(spectrumWith(48, 65, 67), sampleRate);
    expect(matchesStrum(csus4, [0, 5, 7], 0.8)).toBe(true);
    expect(matchesStrum(csus4, [0, 4, 7], 0.6)).toBe(false);
  });
});

describe('matchesArpeggio', () => {
  // Csus4 root position on strings 2-3-4 at fret 10/10/8: C4 F4 G4.
  const shape: ChordTarget = { kind: 'exact', positions: [[60, 65, 67]] };
  const anyCsus4: ChordTarget = { kind: 'pitchClasses', pitchClasses: [0, 5, 7] };

  it('matches the exact shape played up or down', () => {
    expect(matchesArpeggio([60, 65, 67], shape)).toBe(true);
    expect(matchesArpeggio([67, 65, 60], shape)).toBe(true);
    expect(matchesArpeggio([52, 60, 65, 67], shape)).toBe(true);
  });

  it('rejects the right notes in the wrong octave or order for a shape', () => {
    expect(matchesArpeggio([48, 65, 67], shape)).toBe(false);
    expect(matchesArpeggio([65, 60, 67], shape)).toBe(false);
    expect(matchesArpeggio([60, 65], shape)).toBe(false);
  });

  it('matches any voicing of the chord when no shape was asked for', () => {
    expect(matchesArpeggio([55, 60, 65], anyCsus4)).toBe(true);
    expect(matchesArpeggio([60, 64, 67], anyCsus4)).toBe(false);
    expect(matchesArpeggio([60, 60, 67], anyCsus4)).toBe(false);
  });
});
