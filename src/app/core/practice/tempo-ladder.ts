/**
 * A tempo ladder per card: a passed take moves its tempo up, failed ones move it down. Shared by
 * the modules that play along with a metronome.
 */

/** Where a tempo ladder stands, for one card. */
export interface Level {
  readonly bpm: number;
  /** Failed takes in a row at this tempo. */
  readonly failStreak: number;
}

/** Tempo ladders by card key. */
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

/** A card's level, or where it starts before its first take. */
export function levelOf(levels: Levels, key: string, startTempo: number): Level {
  return levels[key] ?? { bpm: startTempo, failStreak: 0 };
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
