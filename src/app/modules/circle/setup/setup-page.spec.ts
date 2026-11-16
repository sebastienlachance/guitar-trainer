import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideCircle } from '../circle-session';
import { SetupPage } from './setup-page';

describe('Circle SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('counts a card per starting note and direction', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideCircle(), provideRouter([])] });

    expect(screen.getByRole('status')).toHaveTextContent('12 cards');

    await user.click(screen.getByRole('button', { name: 'Fifths (C → G)' }));
    expect(screen.getByRole('status')).toHaveTextContent('24 cards');

    await user.click(screen.getByRole('button', { name: 'G♭' }));
    expect(screen.getByRole('status')).toHaveTextContent('22 cards');

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(screen.getByRole('status')).toHaveTextContent('24 cards');
  });

  it('says what is missing when nothing is left to ask', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideCircle(), provideRouter([])] });

    await user.click(screen.getByRole('button', { name: 'Fourths (C → F)' }));

    expect(screen.getByText('Pick a direction: fourths, fifths or both.')).toBeInTheDocument();
  });
});
