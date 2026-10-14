import { TakeScore } from '../../core/audio/timing';
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

/** One subdivision to play along with, at the tempo its ladder has reached. */
export interface RhythmCard extends PracticeCard {
  /** The subdivision id, e.g. "eighth". */
  readonly key: string;
  readonly subdivision: Subdivision;
}

export function buildDeck(settings: RhythmSettings): RhythmCard[] {
  return SUBDIVISIONS.filter((subdivision) => settings.subdivisions.includes(subdivision.id)).map(
    (subdivision) => ({ key: subdivision.id, subdivision }),
  );
}

/** Problems that stop a practice session from starting, in plain words. */
export function settingsProblems(settings: RhythmSettings): string[] {
  const problems: string[] = [];
  if (settings.subdivisions.length === 0) {
    problems.push('Pick at least one subdivision.');
  }
  if (settings.latencyMs === null) {
    problems.push('Calibrate the timing first, in setup. It takes 15 seconds.');
  }
  return problems;
}

/** Rebuilds a card from its stats key; undefined for keys this version doesn't know. */
export function cardFromKey(key: string): RhythmCard | undefined {
  const subdivision = SUBDIVISIONS.find((known) => known.id === key);
  return subdivision ? { key, subdivision } : undefined;
}

/** Where a subdivision's tempo ladder stands. */
export interface Level {
  readonly bpm: number;
  /** Failed takes in a row at this tempo. */
  readonly failStreak: number;
}

export type Levels = Readonly<Record<string, Level>>;

export const TEMPO_STEP = 4;
export const TEMPO_RANGE = { min: 40, max: 240 } as const;

/** A passed take moves the tempo up a step; two failed in a row move it down one. */
export function nextLevel(level: Level, passed: boolean): Level {
  if (passed) {
    return { bpm: Math.min(TEMPO_RANGE.max, level.bpm + TEMPO_STEP), failStreak: 0 };
  }
  if (level.failStreak + 1 >= 2) {
    return { bpm: Math.max(TEMPO_RANGE.min, level.bpm - TEMPO_STEP), failStreak: 0 };
  }
  return { bpm: level.bpm, failStreak: level.failStreak + 1 };
}

export function levelOf(levels: Levels, card: RhythmCard, startTempo: number): Level {
  return levels[card.key] ?? { bpm: startTempo, failStreak: 0 };
}

/** Structural check for levels read back from storage. */
export function isLevels(value: unknown): value is Levels {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (level) =>
        typeof level === 'object' &&
        level !== null &&
        typeof (level as Record<string, unknown>)['bpm'] === 'number' &&
        typeof (level as Record<string, unknown>)['failStreak'] === 'number',
    )
  );
}

/** One take, as kept for the stats. */
export interface TakeRecord {
  readonly subdivision: string;
  readonly bpm: number;
  /** Epoch milliseconds. */
  readonly at: number;
  readonly onTimePct: number;
  readonly biasMs: number;
  readonly spreadMs: number;
  readonly meanAbsMs: number;
  readonly missed: number;
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

/** "On time 91% · on average 8 ms late · spread 14 ms · 1 missed". */
export function scoreSummary(score: TakeScore): string {
  const parts = [
    `On time ${Math.round(score.onTimeRatio * 100)}%`,
    biasWords(score.biasMs),
    `spread ${Math.round(score.spreadMs)} ms`,
  ];
  if (score.missed > 0) {
    parts.push(`${score.missed} missed`);
  }
  return parts.join(' · ');
}
