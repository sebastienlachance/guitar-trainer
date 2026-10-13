import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { TriadSettings } from '../settings';
import { TriadsSession } from '../triads-session';
import { PracticePage } from './practice-page';

function saveSettings(settings: Partial<TriadSettings>): void {
  localStorage.setItem(STORAGE_PREFIX + 'triads:settings', JSON.stringify(settings));
}

function savedStats(): Record<string, { attempts: number; correct: number }> {
  return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'triads:stats') ?? '{}');
}

/** Renders the page and starts a session, as the "Start session" button does. */
async function startPractice() {
  const user = userEvent.setup();
  await render(PracticePage, { providers: [TriadsSession, provideRouter([])] });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  return user;
}

describe('PracticePage', () => {
  beforeEach(() => localStorage.clear());

  it('waits for you to start a session', async () => {
    saveSettings({ qualities: ['sus4'], roots: ['C', 'D'], micMode: 'off' });
    await render(PracticePage, { providers: [TriadsSession, provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'Ready to practise' })).toBeInTheDocument();
    expect(screen.getByText(/2 cards/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument();
  });

  it('prompts a chord, reveals its tones and records your answer', async () => {
    saveSettings({ qualities: ['sus4'], roots: ['C'], promptDetail: 'chord', micMode: 'off' });
    const user = await startPractice();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Csus4');

    await user.click(screen.getByRole('button', { name: /reveal/i }));
    const tones = within(screen.getByRole('list', { name: 'Chord tones' }));
    expect(
      tones.getAllByRole('listitem').map((item) => item.textContent?.replace(/\s+/g, '')),
    ).toEqual(['C1', 'F4', 'G5']);

    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(savedStats()['C|sus4']).toMatchObject({ attempts: 1, correct: 1 });
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
  });

  it('counts the chords of a session and sums it up at the end', async () => {
    saveSettings({ qualities: ['sus4'], roots: ['C', 'D'], micMode: 'off' });
    const user = await startPractice();
    const sessionBar = within(screen.getByRole('region', { name: 'Session' }));
    expect(sessionBar.getByText('0 chords')).toBeInTheDocument();

    await user.keyboard(' ');
    await user.keyboard('{ArrowRight}');
    await user.keyboard(' ');
    await user.keyboard('{ArrowLeft}');
    expect(sessionBar.getByText('2 chords')).toBeInTheDocument();
    expect(sessionBar.getByText('50%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(screen.getByText('Session saved')).toBeInTheDocument();
    expect(screen.getByText('Chords').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Correct').nextElementSibling).toHaveTextContent('50%');
    expect(screen.getByRole('button', { name: /new session/i })).toBeInTheDocument();
  });

  it('hides the prompt while paused', async () => {
    saveSettings({ qualities: ['sus4'], roots: ['C'], micMode: 'off' });
    const user = await startPractice();

    await user.click(screen.getByRole('button', { name: /pause/i }));
    expect(screen.getByRole('heading', { name: 'Paused' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reveal/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /resume/i }));
    expect(screen.getByRole('button', { name: /reveal/i })).toBeInTheDocument();
  });

  it('says nothing was logged when a session ends without answers', async () => {
    saveSettings({ qualities: ['sus4'], roots: ['C'], micMode: 'off' });
    const user = await startPractice();

    await user.click(screen.getByRole('button', { name: /end session/i }));
    expect(screen.getByRole('heading', { name: 'Session ended' })).toBeInTheDocument();
    expect(screen.getByText(/nothing was logged/)).toBeInTheDocument();
  });

  it('works from the keyboard: Space reveals, left arrow marks a miss', async () => {
    saveSettings({ qualities: ['sus2'], roots: ['D'], promptDetail: 'shape', micMode: 'off' });
    const user = await startPractice();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dsus2');
    await user.keyboard(' ');
    expect(screen.getByRole('button', { name: /missed/i })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');

    const [entry] = Object.entries(savedStats());
    expect(entry[0]).toMatch(/^D\|sus2\|triad\|/);
    expect(entry[1]).toMatchObject({ attempts: 1, correct: 0 });
  });

  it('shows the shape asked for and its diagram', async () => {
    saveSettings({
      qualities: ['7'],
      roots: ['Bb'],
      promptDetail: 'shape',
      fourNoteVoicing: 'drop2',
      stringSets: ['1-2-3-4'],
      inversions: [0],
      micMode: 'off',
    });
    const user = await startPractice();

    expect(
      screen.getByText('Drop 2 · Root position · strings 1-2-3-4', { selector: 'p' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reveal/i }));
    expect(
      screen.getAllByRole('img', { name: /^B♭7 Drop 2 · Root position/ }).length,
    ).toBeGreaterThan(0);
  });

  it('explains why practice cannot start', async () => {
    saveSettings({ qualities: [], micMode: 'off' });
    await render(PracticePage, { providers: [TriadsSession, provideRouter([])] });

    expect(screen.getByRole('heading', { name: 'Nothing to practise yet' })).toBeInTheDocument();
    expect(screen.getByText('Pick at least one chord type.')).toBeInTheDocument();
  });
});
