import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { RhythmSession, provideRhythm } from '../rhythm-session';
import { fakeRhythmAudio, saveRhythmSettings } from '../rhythm.testing';
import { PracticePage } from './practice-page';

/** Quarter notes at 60 bpm: one hit a second, 8 hits in 2 bars, after 4 count-in clicks. */
const QUARTERS_AT_60 = {
  subdivisions: ['quarter'],
  startTempo: 60,
  bars: 2,
  click: 'sound' as const,
  latencyMs: 30,
};

async function playTake(
  strikesAfterClicks: (clicks: number[]) => number[],
  settings: object = QUARTERS_AT_60,
) {
  saveRhythmSettings(settings);
  const audio = fakeRhythmAudio();
  await render(PracticePage, {
    providers: [...provideRhythm(), provideRouter([]), ...audio.providers],
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  const session = TestBed.inject(RhythmSession);
  session.run.start();
  await session.play();
  TestBed.tick();
  audio.strikes.set(strikesAfterClicks(audio.lastClicks()));
  vi.advanceTimersByTime(15_000);
  TestBed.tick();
  return audio;
}

describe('Rhythm PracticePage', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.useRealTimers());

  it('scores each hit after the latency, and moves the tempo up after a pass', async () => {
    // Every take hit heard 40 ms after its click: 10 ms late once the 30 ms of latency is off.
    await playTake((clicks) => clicks.slice(4).map((click) => click + 0.04));

    expect(
      screen.getByText('On time 100% · on average 10 ms late · spread 0 ms'),
    ).toBeInTheDocument();
    expect(screen.getByText('Passed. Next time: 64 bpm.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^On time 100%/ })).toBeInTheDocument();
    const levels = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'rhythm:levels') ?? '{}');
    expect(levels).toEqual({ quarter: { bpm: 64, failStreak: 0 } });
  });

  it('counts missed hits and keeps the tempo after a first failed take', async () => {
    await playTake((clicks) => clicks.slice(4, 8).map((click) => click + 0.03));

    expect(screen.getByText(/On time 50% .* 4 missed/)).toBeInTheDocument();
    expect(screen.getByText('Not yet. Try again at 60 bpm.')).toBeInTheDocument();
  });

  describe('a strumming pattern', () => {
    /** Campfire at 60 bpm, 2 bars: eighth-note slots, struck on D.DU.UDU. */
    const CAMPFIRE = { ...QUARTERS_AT_60, subdivisions: [], patterns: ['campfire'] };
    const STRUCK = [true, false, true, true, false, true, true, true];

    /** Strikes on the pattern's strokes, 30 ms late (the latency), plus some in its rests. */
    function strokesAnd(restSlots: number[]) {
      return (clicks: number[]) => {
        const take = clicks.slice(4);
        return [
          ...take.filter((_, index) => STRUCK[index % 8]),
          ...restSlots.map((index) => take[index]),
        ]
          .map((time) => time + 0.03)
          .sort((a, b) => a - b);
      };
    }

    it('is scored on its strokes, with its rests shown in the strip', async () => {
      await playTake(strokesAnd([1]), CAMPFIRE);

      expect(screen.getByRole('heading', { name: /Campfire/ })).toBeInTheDocument();
      expect(
        screen.getByText(/^On time 100% .* 1 strike in a rest$/, { selector: '.summary' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Passed. Next time: 64 bpm.')).toBeInTheDocument();
      expect(screen.getAllByTitle('A rest')).toHaveLength(4);
    });

    it('fails a take with strikes in more than one rest per two bars', async () => {
      await playTake(strokesAnd([1, 12]), CAMPFIRE);

      expect(
        screen.getByText(/2 strikes in a rest$/, { selector: '.summary' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Not yet. Try again at 60 bpm.')).toBeInTheDocument();
    });
  });

  it('warns when the tick reaches the microphone during the count-in', async () => {
    await playTake((clicks) => [
      ...clicks.slice(0, 4).map((click) => click + 0.05),
      ...clicks.slice(4).map((click) => click + 0.03),
    ]);

    expect(screen.getByText(/The tick is reaching the microphone/)).toBeInTheDocument();
  });
});
