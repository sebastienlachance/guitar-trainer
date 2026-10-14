import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { RhythmSession, provideRhythm } from '../rhythm-session';
import { fakeRhythmAudio } from '../rhythm.testing';
import { SetupPage } from './setup-page';

async function calibrateWith(strikesAfterClicks: (clicks: number[]) => number[]) {
  const audio = fakeRhythmAudio();
  await render(SetupPage, {
    providers: [...provideRhythm(), provideRouter([]), ...audio.providers],
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  await TestBed.inject(RhythmSession).calibrate();
  TestBed.tick();
  audio.strikes.set(strikesAfterClicks(audio.lastClicks()));
  vi.advanceTimersByTime(15_000);
  TestBed.tick();
  return audio;
}

describe('Rhythm SetupPage', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.useRealTimers());

  it('asks for calibration before the first session', async () => {
    await render(SetupPage, {
      providers: [...provideRhythm(), provideRouter([]), ...fakeRhythmAudio().providers],
    });

    expect(screen.getByText('Not calibrated yet.')).toBeInTheDocument();
    expect(screen.getByText(/Calibrate the timing first/)).toBeInTheDocument();
  });

  it('measures and saves the delay from the clicks to your strikes', async () => {
    const audio = await calibrateWith((clicks) => clicks.slice(4).map((click) => click + 0.042));

    expect(screen.getByText('Calibrated: 42 ms. Your strikes varied by 0 ms.')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'rhythm:settings') ?? '{}');
    expect(saved.latencyMs).toBe(42);
    expect(audio.listener.stop).toHaveBeenCalled();
  });

  it('says what went wrong when it hears too few strikes', async () => {
    await calibrateWith((clicks) => clicks.slice(4, 7).map((click) => click + 0.04));

    expect(screen.getByText('Heard 3 of 8 strikes.')).toBeInTheDocument();
    expect(screen.getByText(/a little louder, and try again/)).toBeInTheDocument();
  });
});
