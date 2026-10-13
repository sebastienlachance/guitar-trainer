import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideScales } from '../scales-session';
import { ScalesSettings } from '../settings';
import { PracticePage } from './practice-page';

function saveSettings(settings: Partial<ScalesSettings>): void {
  localStorage.setItem(STORAGE_PREFIX + 'scales:settings', JSON.stringify(settings));
}

async function startPractice() {
  const user = userEvent.setup();
  await render(PracticePage, { providers: [...provideScales(), provideRouter([])] });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  const choices = () => within(screen.getByRole('group', { name: 'Scale names' }));
  return { user, choices };
}

describe('Scales PracticePage', () => {
  beforeEach(() => {
    localStorage.clear();
    saveSettings({ scales: ['major', 'minor-pentatonic', 'dorian'] });
    // The first card of the deck comes up: C major in the position from the 2nd fret.
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows a scale with its root and offers the chosen scales', async () => {
    const { choices } = await startPractice();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('C root, frets 2–6');
    expect(
      choices()
        .getAllByRole('button')
        .map((button) => button.textContent?.trim()),
    ).toEqual(['1 Major', '2 Minor pentatonic', '3 Dorian']);
  });

  it('accepts the right scale and shows its formula', async () => {
    const { user, choices } = await startPractice();

    await user.click(choices().getByRole('button', { name: 'Major' }));

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(screen.getByText('Major: 1 2 3 4 5 6 7')).toBeInTheDocument();
  });

  it('marks the right scale after a wrong one', async () => {
    const { user, choices } = await startPractice();

    await user.keyboard('3');

    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(choices().getByRole('button', { name: 'Major (correct answer)' })).toBeInTheDocument();
    expect(choices().getByRole('button', { name: 'Dorian (your answer)' })).toBeInTheDocument();
  });
});
