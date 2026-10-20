import { IntervalName, spellInterval } from './intervals';
import { SpelledNote, displayNoteName, parseNote, pitchClassOf } from './notes';

export interface ChordQuality {
  /** Stable ASCII id used in storage keys, e.g. "m7b5". */
  readonly id: string;
  /** Suffix shown after the root, e.g. "m7♭5". Empty for a major triad. */
  readonly symbol: string;
  readonly name: string;
  /** Chord tones in ascending order from the root. */
  readonly intervals: readonly IntervalName[];
}

export interface ChordTone {
  readonly interval: IntervalName;
  readonly note: SpelledNote;
}

export function spellChord(root: SpelledNote, quality: ChordQuality): ChordTone[] {
  return quality.intervals.map((interval) => ({ interval, note: spellInterval(root, interval) }));
}

export function chordSymbol(root: SpelledNote, quality: ChordQuality): string {
  return displayNoteName(root) + quality.symbol;
}

/** The chord types a chord symbol can name here: the commonest in songs. */
export const SYMBOL_QUALITIES: readonly ChordQuality[] = [
  { id: 'major', symbol: '', name: 'Major', intervals: ['1', '3', '5'] },
  { id: 'minor', symbol: 'm', name: 'Minor', intervals: ['1', 'b3', '5'] },
  { id: '7', symbol: '7', name: 'Dominant 7th', intervals: ['1', '3', '5', 'b7'] },
  { id: 'maj7', symbol: 'maj7', name: 'Major 7th', intervals: ['1', '3', '5', '7'] },
  { id: 'm7', symbol: 'm7', name: 'Minor 7th', intervals: ['1', 'b3', '5', 'b7'] },
];

/** A chord read from its symbol. */
export interface SymbolChord {
  /** The symbol in plain ASCII, e.g. "F#m7": stable, for storage keys. */
  readonly id: string;
  /** As written, e.g. "F♯m7". */
  readonly name: string;
  readonly pitchClasses: readonly number[];
}

/**
 * Reads a chord symbol such as "G", "F#m", "B♭7" or "Cmaj7" (major, m, 7, maj7 or m7 on any
 * root); null when it isn't one.
 */
export function parseChordSymbol(text: string): SymbolChord | null {
  const match = /^([A-G])([#b♯♭]?)(maj7|m7|m|7)?$/.exec(text.trim());
  if (!match) {
    return null;
  }
  const accidental = match[2].replace('♯', '#').replace('♭', 'b');
  const root = parseNote(match[1] + accidental);
  const quality = SYMBOL_QUALITIES.find((known) => known.symbol === (match[3] ?? ''))!;
  return {
    id: match[1] + accidental + quality.symbol,
    name: chordSymbol(root, quality),
    pitchClasses: spellChord(root, quality).map((tone) => pitchClassOf(tone.note)),
  };
}
