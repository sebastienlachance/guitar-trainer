import { SessionRecord } from '../../practice/session-log';
import { niceMax, progressPoints } from './progress-chart';

const MINUTE = 60_000;

function record(id: string, answered: number, totalResponseMs?: number): SessionRecord {
  return {
    id,
    module: 'triads',
    startedAt: 0,
    endedAt: 0,
    activeMs: 4 * MINUTE,
    answered,
    correct: answered,
    ...(totalResponseMs === undefined ? {} : { totalResponseMs }),
  };
}

describe('progress chart data', () => {
  it('rounds the top of the scale up so the line fills the chart', () => {
    expect(niceMax(11.7)).toBe(12);
    expect(niceMax(4.4)).toBe(5);
    expect(niceMax(0.7)).toBe(0.8);
    expect(niceMax(100)).toBe(100);
    expect(niceMax(0)).toBe(1);
  });

  it('plots answers per minute for every session, time each only where it was kept', () => {
    const records = [record('old', 20), record('new', 40, 80_000)];

    expect(progressPoints(records, 'rate').map((point) => point.value)).toEqual([5, 10]);
    expect(progressPoints(records, 'time').map((point) => [point.id, point.value])).toEqual([
      ['new', 2],
    ]);
  });
});
