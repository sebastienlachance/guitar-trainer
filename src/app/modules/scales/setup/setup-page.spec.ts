import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideScales } from '../scales-session';
import { SetupPage } from './setup-page';

describe('Scales SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('updates the deck as you choose scales, and needs at least two', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideScales(), provideRouter([])] });

    // Four scales, 20 positions each up to the 12th fret.
    expect(screen.getByRole('status')).toHaveTextContent('80 cards');

    await user.click(screen.getByRole('button', { name: 'Dorian' }));
    expect(screen.getByRole('status')).toHaveTextContent('100 cards');

    for (const name of ['Major', 'Natural minor', 'Major pentatonic', 'Minor pentatonic']) {
      await user.click(screen.getByRole('button', { name }));
    }
    expect(screen.getByRole('status')).toHaveTextContent('Pick at least two scales');
  });
});
