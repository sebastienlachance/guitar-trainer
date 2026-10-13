import { ChordQuality } from '../../core/music/chords';
import { IntervalName } from '../../core/music/intervals';
import { COMMON_NOTE_NAMES, NATURAL_NOTE_NAMES } from '../../core/music/notes';

/** Chord types offered in the triads module; add a line here to offer another one. */
export const CHORD_QUALITIES: readonly ChordQuality[] = [
  { id: 'major', symbol: '', name: 'Major', intervals: ['1', '3', '5'] },
  { id: 'minor', symbol: 'm', name: 'Minor', intervals: ['1', 'b3', '5'] },
  { id: 'dim', symbol: 'dim', name: 'Diminished', intervals: ['1', 'b3', 'b5'] },
  { id: 'aug', symbol: 'aug', name: 'Augmented', intervals: ['1', '3', '#5'] },
  { id: 'sus2', symbol: 'sus2', name: 'Suspended 2nd', intervals: ['1', '2', '5'] },
  { id: 'sus4', symbol: 'sus4', name: 'Suspended 4th', intervals: ['1', '4', '5'] },
  { id: '6', symbol: '6', name: 'Major 6th', intervals: ['1', '3', '5', '6'] },
  { id: 'm6', symbol: 'm6', name: 'Minor 6th', intervals: ['1', 'b3', '5', '6'] },
  { id: '7', symbol: '7', name: 'Dominant 7th', intervals: ['1', '3', '5', 'b7'] },
  { id: 'maj7', symbol: 'maj7', name: 'Major 7th', intervals: ['1', '3', '5', '7'] },
  { id: 'm7', symbol: 'm7', name: 'Minor 7th', intervals: ['1', 'b3', '5', 'b7'] },
  { id: 'm7b5', symbol: 'm7♭5', name: 'Half-diminished', intervals: ['1', 'b3', 'b5', 'b7'] },
  { id: 'dim7', symbol: 'dim7', name: 'Diminished 7th', intervals: ['1', 'b3', 'b5', 'bb7'] },
  { id: '7sus4', symbol: '7sus4', name: 'Dominant 7th sus4', intervals: ['1', '4', '5', 'b7'] },
];

export const ROOTS = COMMON_NOTE_NAMES;

export const NATURAL_ROOTS = NATURAL_NOTE_NAMES;

export function qualityById(id: string): ChordQuality | undefined {
  return CHORD_QUALITIES.find((quality) => quality.id === id);
}

export function isFourNote(quality: ChordQuality): boolean {
  return quality.intervals.length === 4;
}

/**
 * A four-note chord without its perfect 5th, which adds little to the sound and frees a string.
 * Null when the 5th is altered (m7♭5, dim7), because there the 5th is what defines the chord.
 */
export function shellIntervals(quality: ChordQuality): readonly IntervalName[] | null {
  return isFourNote(quality) && quality.intervals.includes('5')
    ? quality.intervals.filter((interval) => interval !== '5')
    : null;
}
