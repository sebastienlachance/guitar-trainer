import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideIdentify } from '../identify-session';
import { IdentifySettings } from '../settings';
import { PracticePage } from './practice-page';

/** A one-card deck: the dot is always on string 5, fret 7, which is E. */
const E_ON_A: Partial<IdentifySettings> = { notes: ['E'], strings: [5], maxFret: 7 };

function saveSettings(settings: Partial<IdentifySettings>): void {
  localStorage.setItem(STORAGE_PREFIX + 'identify:settings', JSON.stringify(settings));
}

function savedStats(): Record<string, { attempts: number; correct: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'identify:stats') ?? '{}');
}

async function startPractice() {
  const user = userEvent.setup();
  await render(PracticePage, { providers: [...provideIdentify(), provideRouter([])] });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  const choices = () => within(screen.getByRole('group', { name: 'Note names' }));
  return { user, choices };
}

describe('Identify PracticePage', () => {
  beforeEach(() => localStorage.clear());

  it('asks about a position and accepts its name', async () => {
    saveSettings({ ...E_ON_A, choices: 4 });
    const { user, choices } = await startPractice();

    expect(
      await screen.findByRole('heading', { name: 'String 5 (A), fret 7' }),
    ).toBeInTheDocument();
    expect(choices().getAllByRole('button')).toHaveLength(4);
    await user.click(choices().getByRole('button', { name: 'E' }));

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(savedStats()['5:7']).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('marks the right name after a wrong one and waits for Next', async () => {
    saveSettings({ ...E_ON_A, choices: 4 });
    const { user, choices } = await startPractice();

    const [wrong] = choices().getAllByRole('button', { name: (name) => name !== 'E' });
    await user.click(wrong);

    expect(screen.getByText('Not quite')).toBeInTheDocument();
    expect(choices().getByRole('button', { name: 'E (correct answer)' })).toBeInTheDocument();
    expect(choices().getByRole('button', { name: /\(your answer\)/ })).toBe(wrong);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    expect(savedStats()['5:7']).toMatchObject({ attempts: 1, correct: 0 });
  });

  it('answers with a number key when there are four choices', async () => {
    saveSettings({ ...E_ON_A, choices: 4 });
    const { user, choices } = await startPractice();

    const position = choices()
      .getAllByRole('button')
      .indexOf(choices().getByRole('button', { name: 'E' }));
    await user.keyboard(String(position + 1));

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });

  it('offers all twelve names and answers with the arrow keys', async () => {
    saveSettings({ ...E_ON_A, choices: 12 });
    const { user, choices } = await startPractice();

    expect(choices().getAllByRole('button')).toHaveLength(12);
    choices().getByRole('button', { name: 'C' }).focus();
    // C, C♯/D♭, D, D♯/E♭, E
    await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{Enter}');

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });

  it('puts focus on the first answer for keyboard users only', async () => {
    saveSettings({ ...E_ON_A, choices: 12 });
    const user = userEvent.setup();
    await render(PracticePage, { providers: [...provideIdentify(), provideRouter([])] });

    // Start session already has focus: pressing Enter starts it from the keyboard.
    await user.keyboard('{Enter}');
    const group = within(await screen.findByRole('group', { name: 'Note names' }));
    expect(group.getByRole('button', { name: 'C' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'End session' }));
    await user.click(screen.getByRole('button', { name: 'New session' }));
    const again = within(await screen.findByRole('group', { name: 'Note names' }));
    expect(again.getByRole('button', { name: 'C' })).not.toHaveFocus();
  });
});
