import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideIdentify } from '../identify-session';
import { SetupPage } from './setup-page';

describe('Identify SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('updates the deck as you change notes, strings and frets', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideIdentify(), provideRouter([])] });

    // Every position on 6 strings, frets 0 to 12.
    expect(screen.getByRole('status')).toHaveTextContent('78 cards');

    await user.click(screen.getByRole('radio', { name: '0–5' }));
    expect(screen.getByRole('status')).toHaveTextContent('36 cards');

    await user.click(screen.getByRole('button', { name: 'Naturals' }));
    // Frets 0-5 hold exactly 4 natural notes on every string.
    expect(screen.getByRole('status')).toHaveTextContent('24 cards');
  });
});
