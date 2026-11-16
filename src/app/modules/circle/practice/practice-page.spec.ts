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
  await render(PracticePage, { providers: [...provideCircle(), provideRouter([]), ...providers] });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  const choices = () => within(screen.getByRole('group', { name: 'Note names' }));
  return { user, choices };
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
});
