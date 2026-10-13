import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideIntervals } from '../intervals-session';
import { IntervalsSettings } from '../settings';
import { PracticePage } from './practice-page';

/** With Math.random at 0, the ♭3 of F♯ minor pentatonic, root on string 6, frets 1–5. */
const MINOR_THIRD: Partial<IntervalsSettings> = {
  scales: ['minor-pentatonic'],
  rootStrings: [6],
  neck: 'shape',
};

function saveSettings(settings: Partial<IntervalsSettings>): void {
  localStorage.setItem(STORAGE_PREFIX + 'intervals:settings', JSON.stringify(settings));
}

function savedStats(): Record<string, { attempts: number; correct: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'intervals:stats') ?? '{}');
}

async function startPractice(settings: Partial<IntervalsSettings>) {
  saveSettings(settings);
  const user = userEvent.setup();
  const { container } = await render(PracticePage, {
    providers: [...provideIntervals(), provideRouter([])],
  });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  const tap = (string: number, fret: number) =>
    user.click(container.querySelector(`[data-position="${string}:${fret}"]`)!);
  const dots = (kind: string) => container.querySelectorAll(`.dot.${kind}`);
  return { user, tap, dots };
}

describe('Intervals PracticePage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => vi.restoreAllMocks());

  describe('Find', () => {
    it('accepts a tap on the interval and shows the formula', async () => {
      const { tap } = await startPractice({ ...MINOR_THIRD, tasks: ['find'] });

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('♭3 minor 3rd');
      expect(screen.getByText('in F♯ minor pentatonic, root on string 6')).toBeInTheDocument();
      await tap(3, 2);

      expect(screen.getByText(/Correct/)).toBeInTheDocument();
      expect(screen.getByText('Minor pentatonic: 1 ♭3 4 5 ♭7')).toBeInTheDocument();
      expect(savedStats()['find|minor-pentatonic|6|b3']).toMatchObject({ attempts: 1, correct: 1 });
    });

    it('says what a wrong tap was and shows where the interval is', async () => {
      const { tap, dots } = await startPractice({ ...MINOR_THIRD, tasks: ['find'] });

      await tap(5, 2);

      expect(screen.getByText('Not quite')).toBeInTheDocument();
      expect(screen.getByText("That's the 4 (perfect 4th).")).toBeInTheDocument();
      expect(dots('miss')).toHaveLength(1);
      expect([...dots('tone')].map((dot) => dot.textContent?.trim())).toEqual(['♭3', '♭3', '♭3']);
    });

    it('shows the rest of the scale as faint rings around the roots', async () => {
      const { dots } = await startPractice({ ...MINOR_THIRD, tasks: ['find'] });

      expect(dots('root')).toHaveLength(3);
      // F♯ minor pentatonic from fret 1 to 5 has 12 notes, three of them roots.
      expect(dots('ghost')).toHaveLength(9);
    });

    it('shows only the roots when asked to', async () => {
      const { dots } = await startPractice({ ...MINOR_THIRD, tasks: ['find'], neck: 'roots' });

      expect(dots('root')).toHaveLength(3);
      expect(dots('ghost')).toHaveLength(0);
    });
  });

  describe('Name', () => {
    it('marks a note and accepts its interval', async () => {
      const { user, dots } = await startPractice({ ...MINOR_THIRD, tasks: ['name'] });

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('F♯ minor pentatonic');
      expect([...dots('tone')].map((dot) => dot.textContent?.trim())).toEqual(['?']);
      await user.click(screen.getByRole('button', { name: '♭3' }));

      expect(screen.getByText(/Correct/)).toBeInTheDocument();
      expect(savedStats()['name|minor-pentatonic|6|b3']).toMatchObject({ attempts: 1, correct: 1 });
    });

    it('marks the right interval after a wrong one', async () => {
      const { user } = await startPractice({ ...MINOR_THIRD, tasks: ['name'] });
      const choices = within(screen.getByRole('group', { name: 'Intervals' }));

      await user.keyboard('2');

      expect(screen.getByText('Not quite')).toBeInTheDocument();
      expect(choices.getByRole('button', { name: '♭3 (correct answer)' })).toBeInTheDocument();
      expect(choices.getByRole('button', { name: '4 (your answer)' })).toBeInTheDocument();
    });
  });
});
