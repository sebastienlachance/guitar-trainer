import { provideRouter } from '@angular/router';
import { render, screen, within } from '@testing-library/angular';
import { STORAGE_PREFIX } from '../core/practice/storage';
import { MODULES } from '../modules/registry';
import { Home } from './home';

const MINUTE = 60_000;

function saveSessions(sessions: { module: string; startedAt: number; minutes: number }[]): void {
  localStorage.setItem(
    STORAGE_PREFIX + 'sessions',
    JSON.stringify(
      sessions.map(({ module, startedAt, minutes }) => ({
        id: `${module}-${startedAt}`,
        module,
        startedAt,
        endedAt: startedAt + minutes * MINUTE,
        activeMs: minutes * MINUTE,
        answered: 10,
        correct: 9,
      })),
    ),
  );
}

async function renderHome() {
  await render(Home, { providers: [provideRouter([])] });
}

describe('Home', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.useRealTimers());

  it('links to every practice module, in its group', async () => {
    await renderHome();

    for (const module of MODULES) {
      expect(screen.getByRole('link', { name: new RegExp(`^${module.title} `) })).toHaveAttribute(
        'href',
        `/${module.path}`,
      );
    }
    const chords = within(screen.getByRole('region', { name: 'Chords' }));
    expect(
      chords.getAllByRole('link').map((link) => link.querySelector('.title')?.textContent),
    ).toEqual(['Triads', 'Chord changes', 'Progressions']);
    expect(screen.getByRole('region', { name: 'Know the neck' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Rhythm, ear and technique' })).toBeInTheDocument();
  });

  it('says which modules listen through the microphone', async () => {
    await renderHome();

    expect(screen.getByRole('link', { name: /^Bends / })).toHaveAccessibleName(
      /Listens through the microphone\.$/,
    );
    expect(screen.getByRole('link', { name: /^Identify notes / })).not.toHaveAccessibleName(
      /microphone/,
    );
  });

  it('has the tuner at hand, in the header', async () => {
    await renderHome();

    expect(screen.getByRole('link', { name: 'Tuner' })).toHaveAttribute('href', '/tuner');
  });

  it('picks up where you left off, with this week so far', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 21, 15));
    saveSessions([
      { module: 'triads', startedAt: new Date(2026, 9, 21, 9).getTime(), minutes: 5 },
      { module: 'triads', startedAt: new Date(2026, 9, 21, 14).getTime(), minutes: 7 },
      { module: 'rhythm', startedAt: new Date(2026, 9, 20, 19).getTime(), minutes: 9 },
    ]);
    await renderHome();

    const recent = within(screen.getByRole('region', { name: 'Pick up where you left off' }));
    const links = recent.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAccessibleName('Triads today · 12 min');
    expect(links[1]).toHaveAccessibleName('Play along yesterday · 9 min');
    expect(links[1]).toHaveAttribute('href', '/rhythm');
    expect(recent.getByText('21 min · 2 days')).toBeInTheDocument();
  });

  it('shows nothing to pick up before the first session', async () => {
    await renderHome();

    expect(screen.queryByRole('region', { name: 'Pick up where you left off' })).toBeNull();
  });

  it('says a local build is a development build', async () => {
    await renderHome();

    expect(screen.getByText('Development build')).toBeInTheDocument();
  });
});
