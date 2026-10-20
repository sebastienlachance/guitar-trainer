import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { providePlayback } from '../playback-session';
import { SetupPage } from './setup-page';

async function renderSetup() {
  await render(SetupPage, { providers: [...providePlayback(), provideRouter([])] });
  return userEvent.setup();
}

describe('Play it back SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('shows the choices of the kinds of phrases picked', async () => {
    const user = await renderSetup();
    expect(screen.getByRole('heading', { name: 'Intervals' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Melodies' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Melodies' }));

    expect(screen.queryByRole('heading', { name: 'Melodies' })).not.toBeInTheDocument();
    expect(screen.getByText('5 cards')).toBeInTheDocument();
  });

  it('needs something to play back before a session can start', async () => {
    const user = await renderSetup();

    await user.click(screen.getByRole('button', { name: 'Melodies' }));
    await user.click(screen.getByRole('button', { name: 'Intervals' }));

    expect(screen.getByText('Pick intervals, melodies or both.')).toBeInTheDocument();
  });

  it('offers a choice of input only when the microphone checks', async () => {
    const user = await renderSetup();
    expect(screen.getByText('Input')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Check myself' }));

    expect(screen.queryByText('Input')).not.toBeInTheDocument();
  });
});
