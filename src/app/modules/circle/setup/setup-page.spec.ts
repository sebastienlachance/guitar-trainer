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

  it('shows the options of each exercise', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideCircle(), provideRouter([])] });

    await user.click(screen.getByRole('button', { name: '2 steps' }));
    expect(screen.getByRole('status')).toHaveTextContent('24 cards');

    // Laps go through all twelve notes, a step at a time.
    await user.click(screen.getByRole('radio', { name: 'Laps' }));
    expect(screen.queryByRole('button', { name: '2 steps' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Laps start from' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('12 cards');

    await user.click(screen.getByRole('radio', { name: 'Keys' }));
    expect(screen.queryByRole('button', { name: 'Fourths (C → F)' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Major keys to ask about' })).toBeInTheDocument();
    // Three kinds of question about twelve keys.
    expect(screen.getByRole('status')).toHaveTextContent('36 cards');
    await user.click(screen.getByRole('button', { name: 'Relative minor' }));
    expect(screen.getByRole('status')).toHaveTextContent('24 cards');

    await user.click(screen.getByRole('radio', { name: 'On the neck' }));
    expect(screen.getByRole('button', { name: 'Fourths (C → F)' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Laps' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('12 cards');
  });

  it('says what is missing when nothing is left to ask', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideCircle(), provideRouter([])] });

    await user.click(screen.getByRole('button', { name: 'Fourths (C → F)' }));

    expect(screen.getByText('Pick a direction: fourths, fifths or both.')).toBeInTheDocument();
  });
});
