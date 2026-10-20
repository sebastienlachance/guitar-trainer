import { FretPosition } from '../../core/fretboard/fretboard';
import { STANDARD_TUNING, STRING_NUMBERS } from '../../core/fretboard/tuning';
import { displayInterval, intervalFromSemitones, semitonesOf } from '../../core/music/intervals';
import { commonNoteName, mod } from '../../core/music/notes';
import { SCALE_TYPES, ScaleType } from '../../core/music/scales';
import { PracticeCard } from '../../core/practice/practice-run';
import { capitalize } from '../../core/ui/text';
import { MELODY_LENGTHS, PlaybackSettings } from './settings';

/** An interval to hear, up to the octave. */
export interface EarInterval {
  /** Stable id used in storage keys, e.g. "M3". */
  readonly id: string;
  readonly semitones: number;
  readonly name: string;
}

export const EAR_INTERVALS: readonly EarInterval[] = [
  { id: 'm2', semitones: 1, name: 'minor 2nd' },
  { id: 'M2', semitones: 2, name: 'major 2nd' },
  { id: 'm3', semitones: 3, name: 'minor 3rd' },
  { id: 'M3', semitones: 4, name: 'major 3rd' },
  { id: 'P4', semitones: 5, name: 'perfect 4th' },
  { id: 'TT', semitones: 6, name: 'tritone' },
  { id: 'P5', semitones: 7, name: 'perfect 5th' },
  { id: 'm6', semitones: 8, name: 'minor 6th' },
  { id: 'M6', semitones: 9, name: 'major 6th' },
  { id: 'm7', semitones: 10, name: 'minor 7th' },
  { id: 'M7', semitones: 11, name: 'major 7th' },
  { id: 'P8', semitones: 12, name: 'octave' },
];

/** Two notes: the first given, the second a set interval up or down from it. */
export interface IntervalCard extends PracticeCard {
  /** E.g. "interval:M3:up". */
  readonly key: string;
  readonly kind: 'interval';
  readonly interval: EarInterval;
  readonly direction: 'up' | 'down';
}

/** A few notes of a scale, from its root; a new key and tune each time. */
export interface MelodyCard extends PracticeCard {
  /** E.g. "melody:major-pentatonic:3". */
  readonly key: string;
  readonly kind: 'melody';
  readonly scale: ScaleType;
  readonly length: number;
}

export type PlaybackCard = IntervalCard | MelodyCard;

function intervalCard(interval: EarInterval, direction: 'up' | 'down'): IntervalCard {
  return { key: `interval:${interval.id}:${direction}`, kind: 'interval', interval, direction };
}

function melodyCard(scale: ScaleType, length: number): MelodyCard {
  return { key: `melody:${scale.id}:${length}`, kind: 'melody', scale, length };
}

export function buildDeck(settings: PlaybackSettings): PlaybackCard[] {
  const deck: PlaybackCard[] = [];
  if (settings.kinds.includes('interval')) {
    const directions =
      settings.direction === 'both' ? (['up', 'down'] as const) : [settings.direction];
    for (const interval of EAR_INTERVALS.filter((known) => settings.intervals.includes(known.id))) {
      deck.push(...directions.map((direction) => intervalCard(interval, direction)));
    }
  }
  if (settings.kinds.includes('melody')) {
    for (const scale of SCALE_TYPES.filter((known) => settings.scales.includes(known.id))) {
      deck.push(melodyCard(scale, settings.melodyLength));
    }
  }
  return deck;
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: PlaybackSettings): string[] {
  const problems: string[] = [];
  if (settings.kinds.length === 0) {
    problems.push('Pick intervals, melodies or both.');
  }
  if (settings.kinds.includes('interval') && settings.intervals.length === 0) {
    problems.push('Pick at least one interval.');
  }
  if (settings.kinds.includes('melody') && settings.scales.length === 0) {
    problems.push('Pick at least one scale for the melodies.');
  }
  return problems;
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): PlaybackCard | undefined {
  const [kind, id, detail] = key.split(':');
  if (kind === 'interval') {
    const interval = EAR_INTERVALS.find((known) => known.id === id);
    return interval && (detail === 'up' || detail === 'down')
      ? intervalCard(interval, detail)
      : undefined;
  }
  const scale = SCALE_TYPES.find((known) => known.id === id);
  const length = Number(detail);
  return kind === 'melody' && scale && MELODY_LENGTHS.includes(length)
    ? melodyCard(scale, length)
    : undefined;
}

/** "Major 3rd up", or "Major pentatonic melodies" with "3 notes" as detail. */
export function describeCard(card: PlaybackCard): { title: string; detail: string } {
  return card.kind === 'interval'
    ? { title: `${capitalize(card.interval.name)} ${card.direction}`, detail: 'Interval' }
    : { title: `${card.scale.name} melodies`, detail: `${card.length} notes` };
}

/** What to play back this time: a card gets new notes each time it comes up. */
export interface Phrase {
  /** MIDI notes, in order. */
  readonly notes: readonly number[];
  /** Where the first note, which is given, is on the neck. */
  readonly start: FretPosition;
  /** A melody's key: its root pitch class; null for an interval. */
  readonly root: number | null;
}

/** Range of a phrase: from the open low E to fret 12 of the high E. */
const LOWEST = 40;
const HIGHEST = 76;

/** A phrase starts on a note within the first frets, where it's quick to find. */
const START_MAX_FRET = 5;

/** Steps through a melody's scale: mostly to the next note, sometimes skipping one. */
const MELODY_STEPS = [1, -1, 1, -1, 2, -2];

/** How far a melody may wander from its first note, in semitones. */
const MELODY_SPAN = 12;

/** Where to find a note in the first frets: the lowest fret it's at, or null when not there. */
export function startPosition(midi: number): FretPosition | null {
  const places = STRING_NUMBERS.map((string) => ({ string, fret: midi - openNote(string) })).filter(
    (place) => place.fret >= 0 && place.fret <= START_MAX_FRET,
  );
  return places.reduce<FretPosition | null>(
    (best, place) => (best === null || place.fret < best.fret ? place : best),
    null,
  );
}

const START_NOTES = Array.from(
  { length: HIGHEST - LOWEST + 1 },
  (_, index) => LOWEST + index,
).filter((midi) => startPosition(midi) !== null);

/** Picks the notes for a card. `random` is `Math.random` outside tests. */
export function phraseFor(card: PlaybackCard, random: () => number): Phrase {
  const notes = card.kind === 'interval' ? intervalNotes(card, random) : melodyNotes(card, random);
  return {
    notes: notes.notes,
    start: startPosition(notes.notes[0])!,
    root: notes.root,
  };
}

function intervalNotes(card: IntervalCard, random: () => number) {
  const step = card.direction === 'up' ? card.interval.semitones : -card.interval.semitones;
  const first = pick(
    START_NOTES.filter((midi) => inRange(midi + step)),
    random,
  );
  return { notes: [first, first + step], root: null };
}

function melodyNotes(card: MelodyCard, random: () => number) {
  const root = Math.floor(random() * 12);
  const degrees = card.scale.intervals.map(semitonesOf);
  const scaleNotes = Array.from(
    { length: HIGHEST - LOWEST + 1 },
    (_, index) => LOWEST + index,
  ).filter((midi) => degrees.includes(mod(midi - root, 12)));
  const first = pick(
    START_NOTES.filter((midi) => mod(midi - root, 12) === 0),
    random,
  );
  const fits = (index: number) =>
    index >= 0 && index < scaleNotes.length && Math.abs(scaleNotes[index] - first) <= MELODY_SPAN;
  let index = scaleNotes.indexOf(first);
  const notes = [first];
  while (notes.length < card.length) {
    const step = pick(MELODY_STEPS, random);
    const next = [step, -step, Math.sign(step), -Math.sign(step)]
      .map((move) => index + move)
      .find(fits)!;
    index = next;
    notes.push(scaleNotes[index]);
  }
  return { notes, root };
}

function inRange(midi: number): boolean {
  return midi >= LOWEST && midi <= HIGHEST;
}

function pick<T>(choices: readonly T[], random: () => number): T {
  return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
}

function openNote(string: number): number {
  return STANDARD_TUNING[string - 1];
}

/** True when the last notes heard are the phrase, in order and in the same octave. */
export function heardPhrase(heard: readonly number[], notes: readonly number[]): boolean {
  const recent = heard.slice(-notes.length);
  return recent.length === notes.length && recent.every((midi, index) => midi === notes[index]);
}

/**
 * One way to play the phrase: each note at the place nearest the first one's fret, on a string
 * near the last note's. The microphone hears pitch, not strings, so any other way counts too.
 */
export function playPositions(phrase: Phrase): FretPosition[] {
  const positions = [phrase.start];
  for (const midi of phrase.notes.slice(1)) {
    const previous = positions[positions.length - 1];
    const places = STRING_NUMBERS.map((string) => ({
      string,
      fret: midi - openNote(string),
    })).filter((place) => place.fret >= 0 && place.fret <= 15);
    const cost = (place: FretPosition) =>
      Math.abs(place.fret - phrase.start.fret) + 0.5 * Math.abs(place.string - previous.string);
    positions.push(places.reduce((best, place) => (cost(place) < cost(best) ? place : best)));
  }
  return positions;
}

/** "A", "C♯": the notes' names, in the spelling the app uses elsewhere. */
export function noteName(midi: number): string {
  return commonNoteName(mod(midi, 12));
}

/** A melody's notes as degrees of its scale, e.g. "1 2 3 5"; empty for an interval. */
export function degrees(phrase: Phrase): string[] {
  const root = phrase.root;
  return root === null
    ? []
    : phrase.notes.map((midi) => displayInterval(intervalFromSemitones(mod(midi - root, 12))));
}

/** "G major pentatonic". */
export function keyName(card: MelodyCard, phrase: Phrase): string {
  return `${commonNoteName(phrase.root ?? 0)} ${card.scale.name.toLowerCase()}`;
}

/** "string 5, open", "string 6, fret 3". */
export function placeName(position: FretPosition): string {
  return `string ${position.string}, ${position.fret === 0 ? 'open' : `fret ${position.fret}`}`;
}
