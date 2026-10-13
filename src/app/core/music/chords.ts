import { IntervalName, spellInterval } from './intervals';
import { SpelledNote, displayNoteName } from './notes';

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
