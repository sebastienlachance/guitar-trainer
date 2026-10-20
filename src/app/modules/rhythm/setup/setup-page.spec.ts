import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { RhythmSession, provideRhythm } from '../rhythm-session';
import { fakeRhythmAudio } from '../rhythm.testing';
import { SetupPage } from './setup-page';

/** The setup page, on fake timers. */
async function setUp() {
  const audio = fakeRhythmAudio();
  const { fixture } = await render(SetupPage, {
    providers: [...provideRhythm(), provideRouter([]), ...audio.providers],
  });
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  return { audio, fixture, session: TestBed.inject(RhythmSession) };
}

async function calibrateWith(strikesAfterClicks: (clicks: number[]) => number[]) {
  const { audio, session } = await setUp();
  await session.calibrate();
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

  it('offers strumming patterns as cards of their own', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'rhythm:settings',
      JSON.stringify({ subdivisions: [], latencyMs: 30, latencyInput: 'default' }),
    );
    const user = userEvent.setup();
    await render(SetupPage, {
      providers: [...provideRhythm(), provideRouter([]), ...fakeRhythmAudio().providers],
    });
    expect(screen.getByText('Pick at least one subdivision or pattern.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Campfire/ }));

    expect(screen.queryByText('Pick at least one subdivision or pattern.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Campfire: D· DU ·U DU' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('measures and saves the delay from the clicks to your strikes', async () => {
    const audio = await calibrateWith((clicks) => clicks.slice(4).map((click) => click + 0.042));

    expect(screen.getByText('Calibrated: 42 ms. Your strikes varied by 0 ms.')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'rhythm:settings') ?? '{}');
    expect(saved.latencyMs).toBe(42);
    expect(audio.listener.stop).toHaveBeenCalled();
  });

  it('remembers whether it was calibrated with the tick or the light only', async () => {
    localStorage.setItem(STORAGE_PREFIX + 'rhythm:settings', JSON.stringify({ click: 'light' }));
    await calibrateWith((clicks) => clicks.slice(4).map((click) => click + 0.042));

    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'rhythm:settings') ?? '{}');
    expect(saved.latencyClick).toBe('light');
  });

  it('stops a calibration when a session starts, so it can be run again', async () => {
    localStorage.setItem(
      STORAGE_PREFIX + 'rhythm:settings',
      JSON.stringify({ latencyMs: 30, latencyInput: 'default' }),
    );
    const { audio, session } = await setUp();
    await session.calibrate();
    TestBed.tick();
    expect(screen.getByRole('button', { name: 'Calibrate again' })).toBeDisabled();

    session.run.start();
    TestBed.tick();

    expect(audio.metronome.stop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Calibrate again' })).toBeEnabled();
  });

  it('stops a calibration when you leave setup', async () => {
    const { audio, fixture, session } = await setUp();
    await session.calibrate();

    fixture.destroy();
    vi.advanceTimersByTime(15_000);

    expect(session.calibration()).toEqual({ stage: 'idle' });
    expect(audio.metronome.stop).toHaveBeenCalled();
    expect(audio.listener.stop).toHaveBeenCalled();
  });

  it('says what went wrong when it hears too few strikes', async () => {
    await calibrateWith((clicks) => clicks.slice(4, 7).map((click) => click + 0.04));

    expect(screen.getByText('Heard 3 of 8 strikes.')).toBeInTheDocument();
    expect(screen.getByText(/a little louder, and try again/)).toBeInTheDocument();
  });
});
