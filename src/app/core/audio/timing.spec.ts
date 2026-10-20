import { AttackTimer } from './attack-timer';
import { clickSchedule } from './metronome';
import {
  clickLeak,
  estimateLatency,
  gridTimes,
  hitGap,
  passes,
  scoreTake,
  toleranceMs,
} from './timing';

describe('rhythm grid', () => {
  it('spaces hits by tempo and subdivision', () => {
    expect(hitGap(120, 1)).toBe(0.5);
    expect(hitGap(120, 2)).toBe(0.25);
    expect(gridTimes(10, 0.5, 4)).toEqual([10, 10.5, 11, 11.5]);
  });

  it('allows 15% of the gap, kept within 25–50 ms', () => {
    expect(toleranceMs(750)).toBe(50);
    expect(toleranceMs(250)).toBe(37.5);
    expect(toleranceMs(100)).toBe(25);
  });
});

describe('scoreTake', () => {
  const expected = gridTimes(10, 0.5, 4);

  it('measures how early or late each hit was, after the latency', () => {
    // 40 ms of latency; then 10 ms late, on time, 20 ms early, 30 ms late.
    const strikes = [10.05, 10.54, 11.02, 11.57];

    const score = scoreTake(expected, strikes, 40, 0.5);

    expect(score.hits.map((hit) => Math.round(hit.offsetMs!))).toEqual([10, 0, -20, 30]);
    expect(score.onTimeRatio).toBe(1);
    expect(score.biasMs).toBeCloseTo(5);
    expect(score.meanAbsMs).toBeCloseTo(15);
    expect(score.spreadMs).toBeCloseTo(Math.sqrt((25 + 25 + 625 + 625) / 4));
  });

  it('counts missed hits and extra strikes, using each strike once', () => {
    // A double strike near the first beat, nothing near the third.
    const strikes = [10, 10.02, 10.5, 11.5];

    const score = scoreTake(expected, strikes, 0, 0.5);

    expect(score.hits.map((hit) => hit.offsetMs)).toEqual([0, 0, null, 0]);
    expect(score.missed).toBe(1);
    expect(score.extra).toBe(1);
    expect(score.onTimeRatio).toBe(0.75);
  });

  it('passes with 80% on time and no more than 10% missed', () => {
    const grid = gridTimes(0, 0.5, 10);
    const lateBy = (ms: number[]) => grid.map((time, index) => time + ms[index] / 1000);

    expect(passes(scoreTake(grid, lateBy([0, 0, 0, 0, 0, 0, 0, 0, 90, 90]), 0, 0.5))).toBe(true);
    expect(passes(scoreTake(grid, lateBy([0, 0, 0, 0, 0, 0, 0, 90, 90, 90]), 0, 0.5))).toBe(false);
    expect(passes(scoreTake(grid, grid.slice(2), 0, 0.5))).toBe(false);
  });
});

describe('calibration', () => {
  const clicks = gridTimes(5, 0.75, 8);

  it('takes the median delay from the clicks to your strikes', () => {
    const delays = [40, 42, 38, 41, 39, 200, 40, 43];
    const strikes = clicks.map((click, index) => click + delays[index] / 1000);

    const calibration = estimateLatency(clicks, strikes);

    expect(calibration.latencyMs).toBeCloseTo(40.5);
    expect(calibration.matched).toBe(8);
  });

  it('keeps strikes near the half beat together, whichever click they fall nearer to', () => {
    // 375 ms is half a beat at 80 bpm: these strikes alternate between nearer this click and
    // nearer the next one.
    const delays = [373, 377, 374, 376, 372, 378, 375, 375];
    const strikes = clicks.map((click, index) => click + delays[index] / 1000);

    const calibration = estimateLatency(clicks, strikes);

    expect(Math.abs(calibration.latencyMs)).toBeCloseTo(375, 0);
    expect(calibration.spreadMs).toBeLessThan(3);
  });

  it('reads a long delay, like Bluetooth headphones, as late rather than early', () => {
    const strikes = clicks.map((click) => click + 0.45);

    expect(estimateLatency(clicks, strikes).latencyMs).toBeCloseTo(450);
  });

  it('notices when the count-in clicks come back through the microphone', () => {
    const countIn = gridTimes(5, 0.75, 4);

    expect(
      clickLeak(
        countIn,
        countIn.map((click) => click + 0.06),
      ),
    ).toBe(true);
    expect(clickLeak(countIn, [5.06])).toBe(false);
    expect(clickLeak(countIn, [])).toBe(false);
  });
});

describe('AttackTimer', () => {
  const SAMPLE_RATE = 48_000;

  /**
   * One string plucked at the given times (seconds), decaying as it rings. Each pluck restarts
   * the string, as striking it again does. Add several together for several strings.
   */
  function plucks(onsets: number[], frequency: number, seconds: number): Float32Array {
    const samples = new Float32Array(Math.round(seconds * SAMPLE_RATE));
    onsets.forEach((onset, index) => {
      const first = Math.round(onset * SAMPLE_RATE);
      const last =
        index + 1 < onsets.length ? Math.round(onsets[index + 1] * SAMPLE_RATE) : samples.length;
      for (let sample = first; sample < last; sample++) {
        const t = (sample - first) / SAMPLE_RATE;
        const tone =
          Math.sin(2 * Math.PI * frequency * t) + 0.5 * Math.sin(4 * Math.PI * frequency * t);
        samples[sample] = 0.3 * Math.exp(-t / 0.4) * tone;
      }
    });
    return samples;
  }

  function mix(...strings: Float32Array[]): Float32Array {
    return strings[0].map((_, index) => strings.reduce((sum, string) => sum + string[index], 0));
  }

  /** Feeds the samples in 128-sample blocks, as the audio worklet does, starting at `clock`. */
  function strikes(samples: Float32Array, clock = 100): number[] {
    const timer = new AttackTimer(SAMPLE_RATE);
    const found: number[] = [];
    for (let start = 0; start < samples.length; start += 128) {
      found.push(...timer.push(samples.subarray(start, start + 128), clock + start / SAMPLE_RATE));
    }
    return found.map((time) => time - clock);
  }

  /** Within 2.5 ms: ten times finer than the narrowest on-time tolerance (25 ms). */
  function expectTimes(found: number[], onsets: number[]): void {
    expect(found).toHaveLength(onsets.length);
    found.forEach((time, index) => expect(Math.abs(time - onsets[index])).toBeLessThan(0.0025));
  }

  it('times each strike within 2.5 ms, even when the string was still ringing', () => {
    // At 0.25 s apart, the string is still at half its level when struck again.
    const onsets = [0.2, 0.7, 1.2, 1.45, 1.7];
    for (const frequency of [82.4, 196]) {
      expectTimes(strikes(plucks(onsets, frequency, 2.2)), onsets);
    }
  });

  it('times a strike on another string over one still ringing', () => {
    const found = strikes(mix(plucks([0.2], 82.4, 1.5), plucks([0.6, 1.1], 196, 1.5)));

    expectTimes(found, [0.2, 0.6, 1.1]);
  });

  it('hears a ringing note as one strike', () => {
    expect(strikes(plucks([0.3], 82.4, 3))).toHaveLength(1);
  });
});

describe('clickSchedule', () => {
  it('accents the bar, then the beats, softest between beats', () => {
    const clicks = clickSchedule(2, 120, 2, 1);

    expect(clicks.map((click) => click.time)).toEqual([2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75]);
    expect(clicks.map((click) => click.accent)).toEqual([
      'bar',
      'sub',
      'beat',
      'sub',
      'beat',
      'sub',
      'beat',
      'sub',
    ]);
    expect(clicks.map((click) => click.count)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
