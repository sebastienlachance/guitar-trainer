import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideChanges } from '../changes-session';
import { SetupPage } from './setup-page';

async function renderSetup() {
  await render(SetupPage, { providers: [...provideChanges(), provideRouter([])] });
  return userEvent.setup();
}

describe('Chord changes SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('says how many pairs the chosen chords make', async () => {
    const user = await renderSetup();
    expect(screen.getByText(/3 chords make 3 pairs\./)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Am' }));

    expect(screen.getByText(/4 chords make 6 pairs\./)).toBeInTheDocument();
  });

  it('needs two chords before a session can start', async () => {
    localStorage.setItem(STORAGE_PREFIX + 'changes:settings', JSON.stringify({ chords: ['C'] }));
    await renderSetup();

    expect(screen.getByText('Pick at least two chords to change between.')).toBeInTheDocument();
  });

  it('offers a choice of input only when the microphone counts', async () => {
    const user = await renderSetup();
    expect(screen.getByText('Input')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'A tap per change' }));

    expect(screen.queryByText('Input')).not.toBeInTheDocument();
  });
});
