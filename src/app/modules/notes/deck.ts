import { FretPosition } from '../../core/fretboard/fretboard';
import { findNotePositions, pitchClassAt } from '../../core/fretboard/placement';
import { STRING_NUMBERS, stringLabel } from '../../core/fretboard/tuning';
import {
  COMMON_NOTE_NAMES,
  SpelledNote,
  commonNoteName,
  noteName,
  parseNote,
  pitchClassOf,
} from '../../core/music/notes';
import { PracticeCard } from '../../core/practice/practice-run';
import { NotesSettings } from './settings';

export interface NoteCard extends PracticeCard {
  /** Identifies the card in stats: "F#|5" for one string, "G|neck" for the whole neck. */
  readonly key: string;
  readonly note: SpelledNote;
  /** The string to find the note on, or null to find it everywhere on the chosen strings. */
  readonly string: number | null;
}

/** A place on the neck where the note is, with its exact pitch for the microphone. */
export interface Target extends FretPosition {
  readonly midi: number;
}

/** One answer given on the fretboard: where, and whether the note is there. */
export interface Pick {
  readonly position: FretPosition;
  readonly hit: boolean;
}

export function cardKey(note: SpelledNote, string: number | null): string {
  return `${noteName(note)}|${string ?? 'neck'}`;
}

/** Every place that answers the card, within the fret range. */
export function targetsOf(card: NoteCard, settings: NotesSettings): Target[] {
  const strings = card.string === null ? settings.strings : [card.string];
  return findNotePositions(pitchClassOf(card.note), strings, settings.maxFret);
}

export function buildDeck(settings: NotesSettings): NoteCard[] {
  const strings = settings.promptKind === 'string' ? settings.strings : [null];
  return settings.notes
    .map(parseNote)
    .flatMap((note) => strings.map((string) => ({ key: cardKey(note, string), note, string })))
    .filter((card) => targetsOf(card, settings).length > 0);
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: NotesSettings, deck: readonly NoteCard[]): string[] {
  const problems: string[] = [];
  if (settings.notes.length === 0) {
    problems.push('Pick at least one note.');
  }
  if (settings.strings.length === 0) {
    problems.push('Pick at least one string.');
  }
  if (problems.length === 0 && deck.length === 0) {
    problems.push(`None of these notes are within frets 0–${settings.maxFret} on these strings.`);
  }
  return problems;
}

export function isTarget(targets: readonly FretPosition[], position: FretPosition): boolean {
  return targets.some(
    (target) => target.string === position.string && target.fret === position.fret,
  );
}

/** True once every target has been picked. */
export function allFound(targets: readonly FretPosition[], picks: readonly Pick[]): boolean {
  return targets.every((target) =>
    picks.some((pick) => pick.hit && isTarget([target], pick.position)),
  );
}

/** Display name of the note at a position, e.g. "F♯". */
export function noteNameAt(position: FretPosition): string {
  return commonNoteName(pitchClassAt(position));
}

/** Where to look: "on string 5 (A)", "everywhere", or "on strings 4, 5, 6". */
export function whereLabel(card: NoteCard, settings: NotesSettings): string {
  if (card.string !== null) {
    return `on ${stringLabel(card.string)}`;
  }
  return settings.strings.length === STRING_NUMBERS.length
    ? 'everywhere'
    : `on strings ${settings.strings.join(', ')}`;
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): NoteCard | undefined {
  const [name, where] = key.split('|');
  if (!COMMON_NOTE_NAMES.includes(name)) {
    return undefined;
  }
  const string = where === 'neck' ? null : Number(where);
  if (string !== null && !STRING_NUMBERS.includes(string)) {
    return undefined;
  }
  return { key, note: parseNote(name), string };
}
