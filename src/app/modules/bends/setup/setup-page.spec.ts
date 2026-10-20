import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideBends } from '../bends-session';
import { SetupPage } from './setup-page';

describe('Bends SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('makes a card of each string and size picked', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideBends(), provideRouter([])] });
    expect(screen.getByText('3 cards')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Half step' }));

    expect(screen.getByText('6 cards')).toBeInTheDocument();
  });

  it('needs a string before a session can start', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideBends(), provideRouter([])] });

    for (const name of ['1 (e)', '2 (B)', '3 (G)']) {
      await user.click(screen.getByRole('button', { name }));
    }

    expect(screen.getByText('Pick at least one string.')).toBeInTheDocument();
  });
});
