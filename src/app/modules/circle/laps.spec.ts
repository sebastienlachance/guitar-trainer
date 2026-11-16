import {
  LAP_LENGTH,
  LapRecord,
  bestLapMs,
  isLaps,
  lapDone,
  lapRecord,
  lapResultText,
  nextLapDirection,
  startLap,
  withAnswer,
} from './laps';

const lapOf = (direction: LapRecord['direction'], ms: number, misses = 0): LapRecord => ({
  at: 1,
  direction,
  start: 'C',
  ms,
  misses,
});

describe('laps', () => {
  it('adds up the answers until twelve are in', () => {
    let lap = startLap('fourths', 3);
    for (let answer = 0; answer < LAP_LENGTH - 1; answer++) {
      lap = withAnswer(lap, answer !== 4, 2000);
    }
    expect(lapDone(lap)).toBe(false);

    lap = withAnswer(lap, true, 1500);

    expect(lapDone(lap)).toBe(true);
    expect(lapRecord(lap, 99)).toEqual({
      at: 99,
      direction: 'fourths',
      start: 'E♭',
      ms: 23_500,
      misses: 1,
    });
  });

  it('takes each way round in turn when both are chosen', () => {
    expect(nextLapDirection(['fourths'], null)).toBe('fourths');
    expect(nextLapDirection(['fifths'], 'fifths')).toBe('fifths');
    expect(nextLapDirection(['fourths', 'fifths'], null)).toBe('fourths');
    expect(nextLapDirection(['fourths', 'fifths'], 'fourths')).toBe('fifths');
    expect(nextLapDirection(['fourths', 'fifths'], 'fifths')).toBe('fourths');
  });

  it('keeps the best lap each way round, and says how a lap compares', () => {
    const laps = [lapOf('fourths', 40_000), lapOf('fourths', 31_000), lapOf('fifths', 20_000)];

    expect(bestLapMs(laps, 'fourths')).toBe(31_000);
    expect(bestLapMs([], 'fourths')).toBeNull();
    expect(lapResultText(lapOf('fourths', 35_000, 2), laps)).toBe(
      'Lap done in 35.0 s, 2 missed · best 31.0 s',
    );
    expect(lapResultText(lapOf('fourths', 29_000), laps)).toBe('Lap done in 29.0 s · a new best');
    expect(lapResultText(lapOf('fourths', 29_000), [])).toBe('Lap done in 29.0 s');
  });

  it('checks laps read back from storage', () => {
    expect(isLaps([lapOf('fifths', 1000)])).toBe(true);
    expect(isLaps([{ ...lapOf('fifths', 1000), direction: 'thirds' }])).toBe(false);
    expect(isLaps([{ at: 1 }])).toBe(false);
    expect(isLaps('laps')).toBe(false);
  });
});
