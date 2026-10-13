export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export const LETTERS: readonly Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const NATURAL_PITCH_CLASS: Readonly<Record<Letter, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** A note name with its spelling preserved, so Bb and A# stay distinct. */
export interface SpelledNote {
  readonly letter: Letter;
  /** Semitones relative to the natural letter: -2 = double flat, 1 = sharp. */
  readonly accidental: number;
}

/** Positive modulo, so mod(-1, 12) is 11 rather than -1. */
export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function naturalPitchClass(letter: Letter): number {
  return NATURAL_PITCH_CLASS[letter];
}

export function pitchClassOf(note: SpelledNote): number {
  return mod(NATURAL_PITCH_CLASS[note.letter] + note.accidental, 12);
}

export function parseNote(name: string): SpelledNote {
  const match = /^([A-G])(#{1,2}|b{1,2})?$/.exec(name);
  if (!match) {
    throw new Error(`Not a note name: "${name}"`);
  }
  const accidentals = match[2] ?? '';
  const sign = accidentals.startsWith('#') ? 1 : -1;
  return { letter: match[1] as Letter, accidental: sign * accidentals.length };
}

const ASCII_ACCIDENTALS: Readonly<Record<number, string>> = {
  [-2]: 'bb',
  [-1]: 'b',
  0: '',
  1: '#',
  2: '##',
};

const DISPLAY_ACCIDENTALS: Readonly<Record<number, string>> = {
  [-2]: '𝄫',
  [-1]: '♭',
  0: '',
  1: '♯',
  2: '𝄪',
};

/** ASCII spelling such as "Bb", used for keys and storage. */
export function noteName(note: SpelledNote): string {
  return note.letter + ASCII_ACCIDENTALS[note.accidental];
}

/** Display spelling such as "B♭". */
export function displayNoteName(note: SpelledNote): string {
  return note.letter + DISPLAY_ACCIDENTALS[note.accidental];
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Name with octave for a MIDI number, e.g. 52 -> "E3". Uses sharps; for the mic readout only. */
export function midiToName(midi: number): string {
  return SHARP_NAMES[mod(midi, 12)] + (Math.floor(midi / 12) - 1);
}
