import { Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MicListener } from '../../../core/audio/mic-listener';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideCircle } from '../circle-session';
import { CircleSettings } from '../settings';
import { PracticePage } from './practice-page';

/** A one-card deck: E♭ in fourths, whose answer is A♭. */
const E_FLAT_IN_FOURTHS: Partial<CircleSettings> = { directions: ['fourths'], notes: ['Eb'] };

function saveSettings(settings: Partial<CircleSettings>): void {
  localStorage.setItem(STORAGE_PREFIX + 'circle:settings', JSON.stringify(settings));
}

function savedStats(): Record<string, { attempts: number; correct: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'circle:stats') ?? '{}');
}

function fakeMicrophone() {
  return {
    status: signal('listening'),
    errorMessage: signal<string | null>(null),
    heard: signal<readonly number[]>([]),
    chroma: signal<readonly number[] | null>(null),
    strums: signal(0),
    pitch: signal(null),
    start: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    stop: vi.fn(),
    clearHeard: vi.fn(),
  };
}

async function startPractice(providers: Provider[] = []) {
  const user = userEvent.setup();
  const { container } = await render(PracticePage, {
    providers: [...provideCircle(), provideRouter([]), ...providers],
  });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  const choices = (name = 'Note names') => within(screen.getByRole('group', { name }));
  const tap = (string: number, fret: number) =>
    user.click(container.querySelector(`[data-position="${string}:${fret}"]`)!);
  return { user, choices, tap };
}

function savedLaps(): { ms: number; misses: number; start: string }[] {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'circle:laps') ?? '[]');
}

describe('Circle PracticePage', () => {
  beforeEach(() => localStorage.clear());

  it('asks for the next note and accepts it', async () => {
    saveSettings(E_FLAT_IN_FOURTHS);
    const { user, choices } = await startPractice();

    expect(await screen.findByRole('heading', { name: 'E♭ in fourths' })).toBeInTheDocument();
    expect(choices().getAllByRole('button')).toHaveLength(12);
    await user.click(choices().getByRole('button', { name: 'A♭' }));

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Circle of fifths: E♭ to A♭' })).toBeInTheDocument();
    expect(savedStats()['fourths|Eb']).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('marks the right note after a wrong one, on the buttons and the circle', async () => {
    saveSettings({ directions: ['fifths'], notes: ['Eb'] });
    const { user, choices } = await startPractice();

    expect(await screen.findByRole('heading', { name: 'E♭ in fifths' })).toBeInTheDocument();
    await user.click(choices().getByRole('button', { name: 'A♭' }));

    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(choices().getByRole('button', { name: 'B♭ (correct answer)' })).toBeInTheDocument();
    expect(choices().getByRole('button', { name: 'A♭ (your answer)' })).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Circle of fifths: E♭ to B♭, not A♭' }),
    ).toBeInTheDocument();
    expect(savedStats()['fifths|Eb']).toMatchObject({ attempts: 1, correct: 0 });
  });

  it('keeps the circle hidden until you answer', async () => {
    saveSettings(E_FLAT_IN_FOURTHS);
    await startPractice();

    expect(await screen.findByRole('heading', { name: 'E♭ in fourths' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Circle of fifths/ })).not.toBeInTheDocument();
  });

  it('answers with the arrow keys', async () => {
    saveSettings(E_FLAT_IN_FOURTHS);
    const user = userEvent.setup();
    await render(PracticePage, { providers: [...provideCircle(), provideRouter([])] });

    // Start session already has focus: pressing Enter starts it from the keyboard.
    await user.keyboard('{Enter}');
    const choices = within(await screen.findByRole('group', { name: 'Note names' }));
    expect(choices.getByRole('button', { name: 'C' })).toHaveFocus();
    // C, D♭, D, E♭, E, F, G♭, G, A♭
    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{Enter}');

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });

  it('takes the note played in any octave, and ignores the others', async () => {
    saveSettings({ ...E_FLAT_IN_FOURTHS, micMode: 'play' });
    const mic = fakeMicrophone();
    await startPractice([{ provide: MicListener, useValue: mic }]);

    expect(mic.start).toHaveBeenCalledWith('notes');
    expect(screen.getByText(/play it anywhere on the neck/)).toBeInTheDocument();

    // E♭3, the note asked about, then A3: neither answers, and neither counts as a miss.
    mic.heard.set([51, 57]);
    TestBed.tick();
    expect(screen.queryByText('Not quite')).not.toBeInTheDocument();
    expect(savedStats()['fourths|Eb']).toBeUndefined();

    // A♭4
    mic.heard.set([51, 57, 68]);
    TestBed.tick();
    expect(await screen.findByText(/Correct/)).toBeInTheDocument();
    expect(savedStats()['fourths|Eb']).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('asks a few steps round', async () => {
    saveSettings({ ...E_FLAT_IN_FOURTHS, steps: [2] });
    const { user, choices } = await startPractice();

    expect(await screen.findByText('What comes 2 steps after')).toBeInTheDocument();
    await user.click(choices().getByRole('button', { name: 'D♭' }));

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Circle of fifths: E♭ to D♭' })).toBeInTheDocument();
    expect(savedStats()['fourths|Eb|2']).toMatchObject({ attempts: 1, correct: 1 });
  });

  describe('keys', () => {
    it('asks for a key signature, and shows how far round from C the key is', async () => {
      saveSettings({ exercise: 'keys', keyQuestions: ['signature'], notes: ['Ab'] });
      const { user, choices } = await startPractice();

      expect(await screen.findByRole('heading', { name: 'A♭ major' })).toBeInTheDocument();
      await user.click(choices('Key signatures').getByRole('button', { name: '4♯' }));

      expect(screen.getByText('Not quite')).toBeInTheDocument();
      expect(
        choices('Key signatures').getByRole('button', { name: '4♭ (correct answer)' }),
      ).toBeInTheDocument();
      // 4♯ is E major.
      expect(
        screen.getByRole('img', { name: 'Circle of fifths: C to A♭, not E' }),
      ).toBeInTheDocument();
      expect(savedStats()['signature|Ab']).toMatchObject({ attempts: 1, correct: 0 });
    });

    it('asks which major key has a signature', async () => {
      saveSettings({ exercise: 'keys', keyQuestions: ['key'], notes: ['A'] });
      const { user, choices } = await startPractice();

      expect(await screen.findByRole('heading', { name: '3♯' })).toBeInTheDocument();
      await user.click(choices().getByRole('button', { name: 'A' }));

      expect(screen.getByText(/Correct/)).toBeInTheDocument();
    });

    it('asks for the relative minor, spelled from its signature', async () => {
      saveSettings({ exercise: 'keys', keyQuestions: ['relative'], notes: ['B'] });
      const { user, choices } = await startPractice();

      expect(await screen.findByRole('heading', { name: 'B major' })).toBeInTheDocument();
      await user.click(choices('Minor keys').getByRole('button', { name: 'G♯m' }));

      expect(screen.getByText(/Correct/)).toBeInTheDocument();
      expect(screen.queryByRole('img', { name: /Circle of fifths/ })).not.toBeInTheDocument();
    });
  });

  describe('on the neck', () => {
    // With Math.random at 0, A♭ shows on the B string at fret 9: D♭ is on the high E, fret 9.
    const A_FLAT_ON_THE_NECK: Partial<CircleSettings> = { exercise: 'neck', notes: ['Ab'] };

    beforeEach(() => vi.spyOn(Math, 'random').mockReturnValue(0));
    afterEach(() => vi.restoreAllMocks());

    it('takes the next note at the same fret on the next string, and names the shape', async () => {
      saveSettings(A_FLAT_ON_THE_NECK);
      const { tap } = await startPractice();

      expect(await screen.findByRole('heading', { name: 'A♭ in fourths' })).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Note names' })).not.toBeInTheDocument();
      await tap(1, 9);

      expect(screen.getByText(/Correct/)).toBeInTheDocument();
      expect(screen.getByText('Same fret on the next thinner string.')).toBeInTheDocument();
      expect(savedStats()['neck|fourths|Ab']).toMatchObject({ attempts: 1, correct: 1 });
    });

    it('marks a wrong tap and shows where the next note is', async () => {
      saveSettings(A_FLAT_ON_THE_NECK);
      const { tap } = await startPractice();

      await screen.findByRole('heading', { name: 'A♭ in fourths' });
      // C, a fret short of D♭.
      await tap(1, 8);

      expect(screen.getByText('Not quite')).toBeInTheDocument();
      expect(screen.getByText('Same fret on the next thinner string.')).toBeInTheDocument();
      expect(savedStats()['neck|fourths|Ab']).toMatchObject({ attempts: 1, correct: 0 });
    });
  });

  it('goes round in laps: each answer is the next question, and the lap is timed', async () => {
    saveSettings({ directions: ['fourths'], notes: ['C'], order: 'laps' });
    const { user, choices } = await startPractice();

    expect(await screen.findByRole('heading', { name: 'C in fourths' })).toBeInTheDocument();
    expect(screen.getByText('Note 1 of 12 in this lap')).toBeInTheDocument();

    // Answer each one wrong with the note asked about: the next question is the right answer.
    const asked: string[] = [];
    for (let note = 0; note < 12; note++) {
      const heading = screen.getByRole('heading', { level: 1 }).textContent ?? '';
      const subject = heading.replace(/\s*in fourths\s*$/, '').trim();
      asked.push(subject);
      await user.click(choices().getByRole('button', { name: subject }));
      if (note < 11) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }
    }

    expect(asked).toEqual(['C', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'B', 'E', 'A', 'D', 'G']);
    expect(screen.getByText(/^Lap done in \d+\.\d s, 12 missed$/)).toBeInTheDocument();
    expect(savedLaps()).toMatchObject([{ start: 'C', misses: 12 }]);
  });
});
