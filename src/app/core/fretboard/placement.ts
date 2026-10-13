import { IntervalName, semitonesOf } from '../music/intervals';
import { mod } from '../music/notes';
import { Voicing } from '../music/voicings';
import { STANDARD_TUNING, STRING_COUNT } from './tuning';

export interface FrettedNote {
  /** String number, 1 = high E. */
  readonly string: number;
  /** 0 = open string. */
  readonly fret: number;
  readonly midi: number;
  readonly tone: IntervalName;
}

/** Highest fret considered when looking for shapes. */
export const MAX_FRET = 15;

/** Widest stretch allowed between the lowest and highest fretted note of a shape. */
export const MAX_SPAN = 4;

function openString(string: number): number {
  return STANDARD_TUNING[string - 1];
}

/** Distance between the lowest and highest fretted notes; open strings need no stretch. */
export function fretSpan(notes: readonly FrettedNote[]): number {
  const fretted = notes.filter((note) => note.fret > 0).map((note) => note.fret);
  return fretted.length === 0 ? 0 : Math.max(...fretted) - Math.min(...fretted);
}

/**
 * Every playable position of a voicing on a set of adjacent strings, lowest position first.
 * `strings` runs from the lowest-pitched string to the highest, one per voice.
 */
export function placeVoicing(
  voicing: Voicing,
  bassPitchClass: number,
  strings: readonly number[],
): FrettedNote[][] {
  if (strings.length !== voicing.offsets.length) {
    throw new Error(`A ${voicing.offsets.length}-note voicing needs as many strings`);
  }
  const placements: FrettedNote[][] = [];
  for (let bassFret = 0; bassFret <= MAX_FRET; bassFret++) {
    const bassMidi = openString(strings[0]) + bassFret;
    if (mod(bassMidi, 12) !== bassPitchClass) {
      continue;
    }
    const notes = strings.map((string, voice) => {
      const midi = bassMidi + voicing.offsets[voice];
      return { string, fret: midi - openString(string), midi, tone: voicing.tones[voice] };
    });
    const onTheNeck = notes.every((note) => note.fret >= 0 && note.fret <= MAX_FRET);
    if (onTheNeck && fretSpan(notes) <= MAX_SPAN) {
      placements.push(notes);
    }
  }
  return placements;
}

/** Every fret on every string, up to MAX_FRET, where a chord tone can be played. */
export function findChordTones(
  rootPitchClass: number,
  intervals: readonly IntervalName[],
): FrettedNote[] {
  const notes: FrettedNote[] = [];
  for (let string = 1; string <= STRING_COUNT; string++) {
    for (let fret = 0; fret <= MAX_FRET; fret++) {
      const midi = openString(string) + fret;
      const tone = intervals.find(
        (interval) => mod(rootPitchClass + semitonesOf(interval), 12) === mod(midi, 12),
      );
      if (tone) {
        notes.push({ string, fret, midi, tone });
      }
    }
  }
  return notes;
}

/** Pitch class (C = 0) of the note at a string and fret. */
export function pitchClassAt(position: { string: number; fret: number }): number {
  return mod(openString(position.string) + position.fret, 12);
}

/** Every place a pitch class can be played on the given strings, from the nut up to `maxFret`. */
export function findNotePositions(
  pitchClass: number,
  strings: readonly number[],
  maxFret: number,
): { string: number; fret: number; midi: number }[] {
  return strings.flatMap((string) =>
    Array.from({ length: maxFret + 1 }, (_, fret) => ({
      string,
      fret,
      midi: openString(string) + fret,
    })).filter((position) => mod(position.midi, 12) === pitchClass),
  );
}
