import { Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MicListener } from '../../../core/audio/mic-listener';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideNotes } from '../notes-session';
import { NotesSettings } from '../settings';
import { PracticePage } from './practice-page';

function saveSettings(settings: Partial<NotesSettings>): void {
  localStorage.setItem(STORAGE_PREFIX + 'notes:settings', JSON.stringify(settings));
}

function savedStats(): Record<string, { attempts: number; correct: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'notes:stats') ?? '{}');
}

async function startPractice(providers: Provider[] = []) {
  const user = userEvent.setup();
  const result = await render(PracticePage, {
    providers: [...provideNotes(), provideRouter([]), ...providers],
  });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  const tap = (string: number, fret: number) =>
    user.click(result.container.querySelector(`[data-position="${string}:${fret}"]`)!);
  return { user, tap, container: result.container };
}

describe('Notes PracticePage', () => {
  beforeEach(() => localStorage.clear());

  it('accepts the right fret on the asked string', async () => {
    saveSettings({ notes: ['F#'], strings: [5], promptKind: 'string' });
    const { tap } = await startPractice();

    expect(await screen.findByRole('heading', { name: 'F♯ on string 5 (A)' })).toBeInTheDocument();
    await tap(5, 9);

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(savedStats()['F#|5']).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('shows the correction after a wrong fret and waits for Next', async () => {
    saveSettings({ notes: ['F#'], strings: [5], promptKind: 'string' });
    const { tap, container } = await startPractice();

    await tap(5, 7);

    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(screen.getByText("That's E. F♯ is at fret 9.")).toBeInTheDocument();
    expect(container.querySelector('.dot.miss')).not.toBeNull();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(savedStats()['F#|5']).toMatchObject({ attempts: 1, correct: 0 });
  });

  it('answers from the keyboard, starting on the asked string', async () => {
    saveSettings({ notes: ['F#'], strings: [5], promptKind: 'string' });
    const { user } = await startPractice();

    screen.getByRole('application').focus();
    await user.keyboard('{ArrowRight>9/}{Enter}');

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });

  it('puts the keyboard cursor back at the nut for the next card', async () => {
    saveSettings({ notes: ['F#', 'G'], strings: [5], promptKind: 'string' });
    const { user, tap } = await startPractice();

    await tap(5, 7);
    await user.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('String 5 (A), open')).toBeInTheDocument();
  });

  it('counts a whole-neck card as correct only when every place is found without a miss', async () => {
    saveSettings({ notes: ['G'], strings: [5, 6], promptKind: 'neck' });
    const { tap } = await startPractice();

    expect(await screen.findByRole('heading', { name: 'G on strings 5, 6' })).toBeInTheDocument();
    await tap(5, 8);
    expect(screen.getByText('0 of 2 found · 1 miss')).toBeInTheDocument();
    await tap(6, 3);
    await tap(5, 10);

    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(savedStats()['G|neck']).toMatchObject({ attempts: 1, correct: 0 });
  });

  it('takes a whole-neck prompt played string by string, from the lowest', async () => {
    saveSettings({ notes: ['G'], strings: [5, 6], promptKind: 'neck', micMode: 'play' });
    const heard = signal<readonly number[]>([]);
    const mic = {
      status: signal('listening'),
      errorMessage: signal<string | null>(null),
      heard,
      chroma: signal(null),
      strums: signal(0),
      start: vi.fn(async () => undefined),
      retry: vi.fn(async () => undefined),
      stop: vi.fn(),
      clearHeard: vi.fn(),
    };
    const { container } = await startPractice([{ provide: MicListener, useValue: mic }]);
    const highlighted = () =>
      container.querySelector('.string-name.highlight')?.textContent?.trim();

    expect(screen.getByText(/play G on string 6 \(E\)/)).toBeInTheDocument();
    expect(highlighted()).toBe('E');

    // G3 isn't on string 6 below fret 12: it doesn't count yet.
    heard.set([55]);
    TestBed.tick();
    expect(screen.getByText('0 of 2 found')).toBeInTheDocument();

    heard.set([55, 43]);
    TestBed.tick();
    expect(screen.getByText('1 of 2 found')).toBeInTheDocument();
    expect(highlighted()).toBe('A');

    heard.set([55, 43, 55]);
    TestBed.tick();
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(savedStats()['G|neck']).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('reveals the rest with Show me', async () => {
    saveSettings({ notes: ['G'], strings: [5, 6], promptKind: 'neck' });
    const { user, tap, container } = await startPractice();

    await tap(6, 3);
    await user.click(screen.getByRole('button', { name: 'Show me' }));

    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(container.querySelectorAll('.dot.root')).toHaveLength(1);
  });
});
