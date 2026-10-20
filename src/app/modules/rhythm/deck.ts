import { TakeScore, passes } from '../../core/audio/timing';
import { PracticeCard } from '../../core/practice/practice-run';
import { RhythmSettings } from './settings';

export interface Subdivision {
  /** Stable id used in storage keys, e.g. "eighth". */
  readonly id: string;
  readonly name: string;
  /** Hits in each beat. */
  readonly perBeat: number;
  /** How the hits of one bar are counted aloud. */
  readonly counting: string;
}

export const SUBDIVISIONS: readonly Subdivision[] = [
  { id: 'quarter', name: 'Quarter notes', perBeat: 1, counting: '1 2 3 4' },
  { id: 'eighth', name: 'Eighth notes', perBeat: 2, counting: '1 & 2 & 3 & 4 &' },
  {
    id: 'triplet',
    name: 'Triplets',
    perBeat: 3,
    counting: '1 trip let 2 trip let 3 trip let 4 trip let',
  },
  {
    id: 'sixteenth',
    name: 'Sixteenth notes',
    perBeat: 4,
    counting: '1 e & a 2 e & a 3 e & a 4 e & a',
  },
];

/** A strumming pattern: a bar of strokes and rests on a grid of subdivisions. */
export interface StrumPattern {
  /** Stable id used in storage keys, e.g. "campfire". */
  readonly id: string;
  readonly name: string;
  /** The subdivision the strokes sit on. */
  readonly grid: Subdivision;
  /** One bar, slot by slot: D a down stroke, U an up stroke, a dot a rest. */
  readonly strokes: string;
}

function strumPattern(id: string, name: string, gridId: string, strokes: string): StrumPattern {
  return { id, name, grid: SUBDIVISIONS.find((known) => known.id === gridId)!, strokes };
}

export const PATTERNS: readonly StrumPattern[] = [
  strumPattern('campfire', 'Campfire', 'eighth', 'D.DU.UDU'),
  strumPattern('pop', 'Pop', 'eighth', 'D.DUD.DU'),
  strumPattern('offbeat', 'Off-beat', 'eighth', '.U.U.U.U'),
  strumPattern('gallop', 'Gallop', 'sixteenth', 'D.DUD.DUD.DUD.DU'),
  strumPattern('shuffle', 'Shuffle', 'triplet', 'D.UD.UD.UD.U'),
];

/** "D· DU ·U DU": a pattern's strokes beat by beat, rests as dots. */
export function patternBeats(pattern: StrumPattern): string {
  const perBeat = pattern.grid.perBeat;
  return Array.from({ length: pattern.strokes.length / perBeat }, (_, beat) =>
    pattern.strokes.slice(beat * perBeat, (beat + 1) * perBeat).replaceAll('.', '·'),
  ).join(' ');
}

/**
 * Something to play along with, at the tempo its ladder has reached: every hit of a subdivision,
 * or the strokes of a strumming pattern on its subdivision.
 */
export interface RhythmCard extends PracticeCard {
  /** The subdivision id, e.g. "eighth", or "pattern:" and the pattern id. */
  readonly key: string;
  /** The grid of the take: the subdivision itself, or the one a pattern sits on. */
  readonly subdivision: Subdivision;
  readonly pattern: StrumPattern | null;
}

function subdivisionCard(subdivision: Subdivision): RhythmCard {
  return { key: subdivision.id, subdivision, pattern: null };
}

function patternCard(pattern: StrumPattern): RhythmCard {
  return { key: `pattern:${pattern.id}`, subdivision: pattern.grid, pattern };
}

/** Every card there is, subdivisions first, in the order setup shows them. */
export const ALL_CARDS: readonly RhythmCard[] = [
  ...SUBDIVISIONS.map(subdivisionCard),
  ...PATTERNS.map(patternCard),
];

export function buildDeck(settings: RhythmSettings): RhythmCard[] {
  return ALL_CARDS.filter((card) =>
    card.pattern
      ? settings.patterns.includes(card.pattern.id)
      : settings.subdivisions.includes(card.subdivision.id),
  );
}

/** "Eighth notes", or the name of the pattern. */
export function cardName(card: RhythmCard): string {
  return card.pattern?.name ?? card.subdivision.name;
}

/** Which slots of a bar are struck: every one for a subdivision, the strokes of a pattern. */
export function struckSlots(card: RhythmCard): boolean[] {
  return card.pattern
    ? [...card.pattern.strokes].map((stroke) => stroke !== '.')
    : Array.from({ length: 4 * card.subdivision.perBeat }, () => true);
}

/**
 * A take passes with enough hits on time and few missed (`passes`), and for a pattern with its
 * rests left alone: at most one strike in a rest for every two bars.
 */
export function takePasses(score: TakeScore, card: RhythmCard, bars: number): boolean {
  return passes(score) && (card.pattern === null || score.extra <= Math.floor(bars / 2));
}

/** The input key calibration records for the default microphone. */
export const DEFAULT_INPUT = 'default';

/**
 * Problems that stop a practice session from starting, in plain words. `input` is the input
 * that will be listened to: a delay measured on another one doesn't apply to it.
 */
export function settingsProblems(settings: RhythmSettings, input: string): string[] {
  const problems: string[] = [];
  if (settings.subdivisions.length === 0 && settings.patterns.length === 0) {
    problems.push('Pick at least one subdivision or pattern.');
  }
  if (settings.latencyMs === null) {
    problems.push('Calibrate the timing first, in setup. It takes 15 seconds.');
  } else if ((settings.latencyInput ?? DEFAULT_INPUT) !== input) {
    // Calibrations from before inputs could be chosen were made with the default microphone.
    problems.push('The input changed since you calibrated: calibrate again, in setup.');
  }
  return problems;
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): RhythmCard | undefined {
  return ALL_CARDS.find((card) => card.key === key);
}

/** One take, as kept for the stats. */
export interface TakeRecord {
  /** The card key: a subdivision id, or "pattern:" and a pattern id. */
  readonly subdivision: string;
  readonly bpm: number;
  /** Epoch milliseconds. */
  readonly at: number;
  readonly onTimePct: number;
  readonly biasMs: number;
  readonly spreadMs: number;
  readonly meanAbsMs: number;
  readonly missed: number;
  /** Strikes that matched no hit: in a pattern, strikes in its rests. Missing in older takes. */
  readonly extra?: number;
  readonly passed: boolean;
}

export const TAKES_KEPT = 200;

export function takeRecord(
  card: RhythmCard,
  bpm: number,
  score: TakeScore,
  passed: boolean,
  at: number,
): TakeRecord {
  return {
    subdivision: card.key,
    bpm,
    at,
    onTimePct: Math.round(score.onTimeRatio * 100),
    biasMs: Math.round(score.biasMs),
    spreadMs: Math.round(score.spreadMs),
    meanAbsMs: Math.round(score.meanAbsMs),
    missed: score.missed,
    extra: score.extra,
    passed,
  };
}

/** Structural check for takes read back from storage. */
export function isTakes(value: unknown): value is TakeRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (take) =>
        typeof take === 'object' &&
        take !== null &&
        typeof (take as Record<string, unknown>)['subdivision'] === 'string' &&
        ['bpm', 'at', 'onTimePct', 'biasMs', 'spreadMs', 'meanAbsMs', 'missed'].every(
          (field) => typeof (take as Record<string, unknown>)[field] === 'number',
        ) &&
        ['undefined', 'number'].includes(typeof (take as Record<string, unknown>)['extra']) &&
        typeof (take as Record<string, unknown>)['passed'] === 'boolean',
    )
  );
}

/** "on average 8 ms late", "on average 12 ms early", or "right on the beat on average". */
export function biasWords(biasMs: number): string {
  const ms = Math.round(Math.abs(biasMs));
  if (ms < 3) {
    return 'right on the beat on average';
  }
  return `on average ${ms} ms ${biasMs > 0 ? 'late' : 'early'}`;
}

/**
 * "On time 91% · on average 8 ms late · spread 14 ms · 1 missed", and with `hasRests` (a pattern)
 * "· 1 strike in a rest".
 */
export function scoreSummary(score: TakeScore, hasRests = false): string {
  const parts = [
    `On time ${Math.round(score.onTimeRatio * 100)}%`,
    biasWords(score.biasMs),
    `spread ${Math.round(score.spreadMs)} ms`,
  ];
  if (score.missed > 0) {
    parts.push(`${score.missed} missed`);
  }
  if (hasRests && score.extra > 0) {
    parts.push(`${score.extra} ${score.extra === 1 ? 'strike' : 'strikes'} in a rest`);
  }
  return parts.join(' · ');
}
