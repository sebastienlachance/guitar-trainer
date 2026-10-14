import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { PracticeLog } from '../../../core/practice/practice-log';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideTriads } from '../triads-session';
import { SetupPage } from './setup-page';

async function renderSetup() {
  return render(SetupPage, { providers: [...provideTriads(), provideRouter([])] });
}

describe('SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('starts with sus2 and sus4 on every root', async () => {
    await renderSetup();

    expect(screen.getByRole('button', { name: 'Csus2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'C7' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent('24 cards');
  });

  it('updates the deck and remembers the choice', async () => {
    const user = userEvent.setup();
    await renderSetup();

    await user.click(screen.getByRole('button', { name: 'C7' }));
    await user.click(screen.getByRole('button', { name: 'Naturals' }));

    expect(screen.getByRole('status')).toHaveTextContent('21 cards');
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'triads:settings') ?? '{}');
    expect(saved.qualities).toEqual(['sus2', 'sus4', '7']);
  });

  it('offers a time limit only with the microphone on', async () => {
    const user = userEvent.setup();
    await renderSetup();

    expect(screen.queryByRole('group', { name: 'Time limit' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Strum' }));
    await user.click(screen.getByRole('radio', { name: '5 s' }));

    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'triads:settings') ?? '{}');
    expect(saved).toMatchObject({ micMode: 'strum', timeLimit: 5 });
  });

  it('offers four-note shape options only when a four-note chord is chosen', async () => {
    const user = userEvent.setup();
    await renderSetup();

    expect(screen.queryByRole('group', { name: 'Four-note shapes' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cm7' }));
    expect(screen.getByRole('group', { name: 'Four-note shapes' })).toBeInTheDocument();
  });

  it('starts a timed session', async () => {
    const user = userEvent.setup();
    await render(SetupPage, {
      providers: [...provideTriads(), provideRouter([{ path: 'practice', children: [] }])],
    });

    await user.click(screen.getByRole('button', { name: 'Start session' }));

    expect(TestBed.inject(PracticeLog).current()).toMatchObject({ module: 'triads', answered: 0 });
  });

  it('says what is missing when nothing is selected', async () => {
    const user = userEvent.setup();
    await renderSetup();

    await user.click(screen.getByRole('button', { name: 'Csus2' }));
    await user.click(screen.getByRole('button', { name: 'Csus4' }));

    expect(screen.getByRole('status')).toHaveTextContent('Pick at least one chord type.');
  });
});
