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

async function renderPractice() {
  return render(PracticePage, { providers: [TriadsSession, provideRouter([])] });
}

describe('PracticePage', () => {
  beforeEach(() => localStorage.clear());

  it('prompts a chord, reveals its tones and records your answer', async () => {
    saveSettings({ qualities: ['sus4'], roots: ['C'], promptDetail: 'chord', micMode: 'off' });
    const user = userEvent.setup();
    await renderPractice();

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

  it('works from the keyboard: Space reveals, left arrow marks a miss', async () => {
    saveSettings({ qualities: ['sus2'], roots: ['D'], promptDetail: 'shape', micMode: 'off' });
    const user = userEvent.setup();
    await renderPractice();

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
    const user = userEvent.setup();
    await renderPractice();

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
    await renderPractice();

    expect(screen.getByRole('heading', { name: 'Nothing to practise yet' })).toBeInTheDocument();
    expect(screen.getByText('Pick at least one chord type.')).toBeInTheDocument();
  });
});
