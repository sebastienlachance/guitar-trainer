import { CIRCLE_DIRECTIONS, CircleDirection, circleNoteLabel } from '../../core/music/circle';
import { formatSeconds } from '../../core/ui/text';

/** A lap goes once round the circle: twelve answers. */
export const LAP_LENGTH = 12;

/** Laps kept in storage: years of practice. */
export const LAPS_KEPT = 500;

/** A lap under way. */
export interface Lap {
  readonly direction: CircleDirection;
  /** The pitch class it started from. */
  readonly start: number;
  readonly answered: number;
  readonly misses: number;
  /** The time of its answers so far, pauses left out. */
  readonly ms: number;
}

/** A finished lap, as kept for the stats. */
export interface LapRecord {
  /** Epoch milliseconds. */
  readonly at: number;
  readonly direction: CircleDirection;
  /** The note it started from, as shown: "E♭". */
  readonly start: string;
  readonly ms: number;
  readonly misses: number;
}

export function startLap(direction: CircleDirection, start: number): Lap {
  return { direction, start, answered: 0, misses: 0, ms: 0 };
}

export function withAnswer(lap: Lap, correct: boolean, ms: number): Lap {
  return {
    ...lap,
    answered: lap.answered + 1,
    misses: lap.misses + (correct ? 0 : 1),
    ms: lap.ms + ms,
  };
}

export function lapDone(lap: Lap): boolean {
  return lap.answered >= LAP_LENGTH;
}

export function lapRecord(lap: Lap, at: number): LapRecord {
  return {
    at,
    direction: lap.direction,
    start: circleNoteLabel(lap.start),
    ms: lap.ms,
    misses: lap.misses,
  };
}

/** The way round for the next lap: the chosen one, or each in turn when both are chosen. */
export function nextLapDirection(
  directions: readonly CircleDirection[],
  last: CircleDirection | null,
): CircleDirection {
  if (directions.length < 2 || last === null) {
    return directions[0] ?? 'fourths';
  }
  return directions.find((direction) => direction !== last) ?? directions[0];
}

/** The fastest lap that way round, or null before the first. */
export function bestLapMs(laps: readonly LapRecord[], direction: CircleDirection): number | null {
  const times = laps.filter((lap) => lap.direction === direction).map((lap) => lap.ms);
  return times.length > 0 ? Math.min(...times) : null;
}

/** "Lap done in 31.2 s, 1 missed · a new best", against the laps before it. */
export function lapResultText(lap: LapRecord, earlier: readonly LapRecord[]): string {
  const missed = lap.misses > 0 ? `, ${lap.misses} missed` : '';
  const best = bestLapMs(earlier, lap.direction);
  const against =
    best === null ? '' : lap.ms < best ? ' · a new best' : ` · best ${formatSeconds(best)}`;
  return `Lap done in ${formatSeconds(lap.ms)}${missed}${against}`;
}

/** Structural check for laps read back from storage. */
export function isLaps(value: unknown): value is LapRecord[] {
  return (
    Array.isArray(value) &&
    value.every((lap) => {
      const fields = (typeof lap === 'object' && lap !== null ? lap : {}) as Record<
        string,
        unknown
      >;
      return (
        ['at', 'ms', 'misses'].every((field) => typeof fields[field] === 'number') &&
        typeof fields['start'] === 'string' &&
        CIRCLE_DIRECTIONS.includes(fields['direction'] as CircleDirection)
      );
    })
  );
}
