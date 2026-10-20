import { SymbolChord, parseChordSymbol } from '../../core/music/chords';
import { PracticeCard } from '../../core/practice/practice-run';
import { PRESET_KEYS, ProgressionsSettings } from './settings';

/** A progression to play: its chords in order, a bar or two beats each. */
export interface ProgressionCard extends PracticeCard {
  /** The chord ids joined by dashes, e.g. "G-D-Em-C": the same progression typed in shares it. */
  readonly key: string;
  readonly chords: readonly SymbolChord[];
  /** What it is, e.g. "I–V–vi–IV in G"; null for one you wrote. */
  readonly name: string | null;
}

const PRESET_NAMES: Readonly<Record<string, string>> = {
  'G-D-Em-C': 'I–V–vi–IV in G',
  'C-G-Am-F': 'I–V–vi–IV in C',
  'Am-F-C-G': 'vi–IV–I–V in C',
  'A-D-E-A': 'I–IV–V–I in A',
  'D-A-Bm-G': 'I–V–vi–IV in D',
};

/** The most chords a progression can have: more is a song, not a drill. */
export const MAX_CHORDS = 8;

function progressionCard(chords: readonly SymbolChord[]): ProgressionCard {
  const key = chords.map((chord) => chord.id).join('-');
  return { key, chords, name: PRESET_NAMES[key] ?? null };
}

/** The ready-made progressions. */
export const PRESETS: readonly ProgressionCard[] = PRESET_KEYS.map(
  (key) => cardFromKey(key) as ProgressionCard,
);

/** A progression read from text, or what's wrong with it. */
export type ReadProgression =
  | { readonly card: ProgressionCard; readonly problem?: undefined }
  | { readonly card?: undefined; readonly problem: string };

/** Reads chord symbols separated by spaces (or dashes), such as "E A B7 A". */
export function readProgression(text: string): ReadProgression {
  const symbols = text.split(/[\s-]+/).filter((symbol) => symbol !== '');
  const unknown = symbols.find((symbol) => parseChordSymbol(symbol) === null);
  if (unknown !== undefined) {
    return {
      problem: `"${unknown}" isn't a chord the app knows: a root, then nothing, m, 7, maj7 or m7.`,
    };
  }
  if (symbols.length < 2) {
    return { problem: 'A progression needs at least two chords.' };
  }
  if (symbols.length > MAX_CHORDS) {
    return { problem: `Up to ${MAX_CHORDS} chords.` };
  }
  return { card: progressionCard(symbols.map((symbol) => parseChordSymbol(symbol)!)) };
}

export function buildDeck(settings: ProgressionsSettings): ProgressionCard[] {
  const chosen = PRESETS.filter((card) => settings.presets.includes(card.key));
  const custom = settings.custom.trim() === '' ? null : readProgression(settings.custom).card;
  return custom && !chosen.some((card) => card.key === custom.key) ? [...chosen, custom] : chosen;
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(deck: readonly ProgressionCard[]): string[] {
  return deck.length === 0 ? ['Pick a progression, or write your own.'] : [];
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): ProgressionCard | undefined {
  return readProgression(key.replaceAll('-', ' ')).card;
}

/** "G D Em C". */
export function chordsText(card: ProgressionCard): string {
  return card.chords.map((chord) => chord.name).join(' ');
}

/** Times through the progression in a take, after a bar of count-in. */
export const PASSES = 2;

/** A chord of a take, and when its first beat falls, in seconds on the audio clock. */
export interface Slot {
  readonly chord: SymbolChord;
  readonly time: number;
}

/** The chords of a take in order, `PASSES` times through, from `start`. */
export function takeSlots(
  card: ProgressionCard,
  start: number,
  beat: number,
  beatsPerChord: number,
): Slot[] {
  const chords = Array.from({ length: PASSES }, () => card.chords).flat();
  return chords.map((chord, index) => ({ chord, time: start + index * beatsPerChord * beat }));
}

/**
 * The chord a strike is meant for: from a quarter beat before its first beat until a quarter beat
 * before the next chord's. -1 outside the take.
 */
export function slotAt(
  slots: readonly Slot[],
  time: number,
  beat: number,
  beatsPerChord: number,
): number {
  return slots.findIndex(
    (slot) => time >= slot.time - beat / 4 && time < slot.time + beatsPerChord * beat - beat / 4,
  );
}

export type SlotOutcome = 'on-time' | 'late' | 'missed';

/**
 * How a chord landed, from the first strike that sounded like it: on time up to half a beat after
 * its first beat (a quarter beat early is on time too), late after that, missed without one.
 * The window is wide enough to take in the delay of speakers and microphone.
 */
export function slotOutcome(slot: Slot, strike: number | null, beat: number): SlotOutcome {
  if (strike === null) {
    return 'missed';
  }
  return strike - slot.time <= beat / 2 ? 'on-time' : 'late';
}

/** A take passes with at least this share of its chords on time: 7 in 8. */
const PASS_RATIO = 0.85;

export function takePasses(outcomes: readonly SlotOutcome[]): boolean {
  const onTime = outcomes.filter((outcome) => outcome === 'on-time').length;
  return onTime >= PASS_RATIO * outcomes.length;
}

/** "6 of 8 chords on the beat · 1 late · 1 missed". */
export function outcomeSummary(outcomes: readonly SlotOutcome[]): string {
  const count = (kind: SlotOutcome) => outcomes.filter((outcome) => outcome === kind).length;
  const parts = [`${count('on-time')} of ${outcomes.length} chords on the beat`];
  if (count('late') > 0) {
    parts.push(`${count('late')} late`);
  }
  if (count('missed') > 0) {
    parts.push(`${count('missed')} missed`);
  }
  return parts.join(' · ');
}

/** One take, as kept for the stats. */
export interface TakeRecord {
  /** The card key, e.g. "G-D-Em-C". */
  readonly progression: string;
  readonly bpm: number;
  /** Epoch milliseconds. */
  readonly at: number;
  readonly onTime: number;
  readonly total: number;
  readonly passed: boolean;
}

export const TAKES_KEPT = 200;

/** Structural check for takes read back from storage. */
export function isTakes(value: unknown): value is TakeRecord[] {
  return (
    Array.isArray(value) &&
    value.every((take) => {
      const fields = (typeof take === 'object' && take !== null ? take : {}) as Record<
        string,
        unknown
      >;
      return (
        typeof fields['progression'] === 'string' &&
        ['bpm', 'at', 'onTime', 'total'].every((field) => typeof fields[field] === 'number') &&
        typeof fields['passed'] === 'boolean'
      );
    })
  );
}
