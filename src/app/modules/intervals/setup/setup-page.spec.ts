import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideIntervals } from '../intervals-session';
import { SetupPage } from './setup-page';

describe('Intervals SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('updates the deck as you choose, and needs a kind of question', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideIntervals(), provideRouter([])] });

    // Find and name × (6 major + 4 minor pentatonic intervals) × root on strings 6 and 5.
    expect(screen.getByRole('status')).toHaveTextContent('40 cards');

    await user.click(screen.getByRole('button', { name: 'Name it' }));
    expect(screen.getByRole('status')).toHaveTextContent('20 cards');

    await user.click(screen.getByRole('button', { name: 'String 5' }));
    expect(screen.getByRole('status')).toHaveTextContent('10 cards');

    await user.click(screen.getByRole('button', { name: 'Find it' }));
    expect(screen.getByRole('status')).toHaveTextContent('Pick Find, Name or both.');
  });
});
