import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { provideNotes } from '../notes-session';
import { SetupPage } from './setup-page';

describe('Notes SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('updates the deck as you change notes, prompt and fret range', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideNotes(), provideRouter([])] });

    // 12 notes on 6 strings, all within frets 0-12.
    expect(screen.getByRole('status')).toHaveTextContent('72 cards');

    await user.click(screen.getByRole('button', { name: 'Naturals' }));
    expect(screen.getByRole('status')).toHaveTextContent('42 cards');

    await user.click(screen.getByRole('radio', { name: 'Whole neck' }));
    expect(screen.getByRole('status')).toHaveTextContent('7 cards');
  });

  it('explains how playing works for each kind of prompt', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideNotes(), provideRouter([])] });

    await user.click(screen.getByRole('radio', { name: 'Play the note' }));
    expect(screen.getByText(/same note on another string also counts/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Whole neck' }));
    expect(screen.getByText(/Play every place string by string/)).toBeInTheDocument();
  });

  it('says what is missing when no string is chosen', async () => {
    const user = userEvent.setup();
    await render(SetupPage, { providers: [...provideNotes(), provideRouter([])] });

    for (const name of ['1 (e)', '2 (B)', '3 (G)', '4 (D)', '5 (A)', '6 (E)']) {
      await user.click(screen.getByRole('button', { name }));
    }

    expect(screen.getByRole('status')).toHaveTextContent('Pick at least one string.');
  });
});
