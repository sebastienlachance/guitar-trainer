import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { provideProgressions } from '../progressions-session';
import { SetupPage } from './setup-page';

async function renderSetup() {
  const user = userEvent.setup();
  await render(SetupPage, { providers: [...provideProgressions(), provideRouter([])] });
  return user;
}

function savedCustom(): string {
  const saved = localStorage.getItem(STORAGE_PREFIX + 'progressions:settings') ?? '{}';
  return JSON.parse(saved).custom;
}

describe('Progressions SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('adds a progression you write as a card of its own', async () => {
    const user = await renderSetup();
    expect(screen.getByText('1 card')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Your own' }), 'E A B7 A');

    expect(screen.getByText('2 cards')).toBeInTheDocument();
    expect(savedCustom()).toBe('E A B7 A');
  });

  it('says what is wrong with a progression it cannot read', async () => {
    const user = await renderSetup();

    await user.type(screen.getByRole('textbox', { name: 'Your own' }), 'E H');

    expect(screen.getByText(/^"H" isn't a chord the app knows/)).toBeInTheDocument();
    expect(screen.getByText('1 card')).toBeInTheDocument();
  });

  it('needs a progression before a session can start', async () => {
    const user = await renderSetup();

    await user.click(screen.getByRole('button', { name: 'G D Em C' }));

    expect(screen.getByText('Pick a progression, or write your own.')).toBeInTheDocument();
  });
});
