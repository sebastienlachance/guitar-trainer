import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MicListener } from '../../../core/audio/mic-listener';
import { PhrasePlayer } from '../../../core/audio/phrase-player';
import { STORAGE_PREFIX } from '../../../core/practice/storage';
import { providePlayback } from '../playback-session';
import { PlaybackSettings } from '../settings';
import { PracticePage } from './practice-page';

/** E2 to G♯2: the major 3rd up from the lowest first note, which `Math.random` at 0 picks. */
const E2 = 40;
const G_SHARP2 = 44;

/** What the microphone hears; the rest of MicListener does nothing. */
function fakeMicrophone() {
  const heard = signal<readonly number[]>([]);
  return {
    status: signal('listening'),
    errorMessage: signal<string | null>(null),
    heard,
    chroma: signal<readonly number[] | null>(null),
    strums: signal(0),
    pitch: signal(null),
    start: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    stop: vi.fn(),
    clearHeard: vi.fn(() => heard.set([])),
  };
}

/** A player whose phrase ends when the test says so. */
function fakePlayer() {
  const playing = signal(false);
  let finish: ((completed: boolean) => void) | null = null;
  const player = {
    playing,
    play: vi.fn<(notes: readonly number[]) => Promise<boolean>>(
      () =>
        new Promise((resolve) => {
          playing.set(true);
          finish = resolve;
        }),
    ),
    stop: vi.fn(),
  };
  const phraseEnds = async () => {
    playing.set(false);
    finish?.(true);
    await Promise.resolve();
    TestBed.tick();
  };
  return { player, phraseEnds };
}

async function practise(settings: Partial<PlaybackSettings>) {
  localStorage.setItem(STORAGE_PREFIX + 'playback:settings', JSON.stringify(settings));
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const mic = fakeMicrophone();
  const { player, phraseEnds } = fakePlayer();
  const user = userEvent.setup();
  await render(PracticePage, {
    providers: [
      ...providePlayback(),
      provideRouter([]),
      { provide: MicListener, useValue: mic },
      { provide: PhrasePlayer, useValue: player },
    ],
  });
  await user.click(screen.getByRole('button', { name: /start session/i }));
  const hear = (notes: number[]) => {
    mic.heard.set(notes);
    TestBed.tick();
  };
  return { mic, player, phraseEnds, user, hear };
}

const MAJOR_THIRD_UP = { kinds: ['interval'], intervals: ['M3'], direction: 'up' } as const;

describe('Play it back PracticePage', () => {
  beforeEach(() => localStorage.clear());

  afterEach(() => vi.restoreAllMocks());

  it('plays the phrase as the card appears, and gives its first note', async () => {
    const { player } = await practise({ ...MAJOR_THIRD_UP, answer: 'mic' });

    expect(player.play).toHaveBeenCalledWith([E2, G_SHARP2]);
    expect(screen.getByRole('heading', { name: 'Starts on E' })).toBeInTheDocument();
    expect(screen.getByText('string 6, open · then one note')).toBeInTheDocument();
    expect(screen.getByText('An interval, up')).toBeInTheDocument();
  });

  it('checks what you play once the phrase has ended, not the speakers', async () => {
    const { mic, phraseEnds, hear } = await practise({ ...MAJOR_THIRD_UP, answer: 'mic' });
    expect(mic.start).toHaveBeenCalledWith('notes');

    hear([E2, G_SHARP2]); // the speakers, heard while the phrase plays
    expect(screen.queryByText(/Correct/)).not.toBeInTheDocument();

    await phraseEnds();
    expect(mic.clearHeard).toHaveBeenCalled();
    hear([E2, G_SHARP2]);

    expect(screen.getByText(/Correct/)).toBeInTheDocument();
    expect(screen.getByText('Major 3rd up')).toBeInTheDocument();
  });

  it('does not take a wrong note, or the right one in another octave', async () => {
    const { phraseEnds, hear } = await practise({ ...MAJOR_THIRD_UP, answer: 'mic' });
    await phraseEnds();

    hear([E2, G_SHARP2 + 1]);
    hear([E2, G_SHARP2 + 12]);

    expect(screen.queryByText(/Correct/)).not.toBeInTheDocument();
  });

  it('plays the phrase again after a pause, and only takes an answer played after it', async () => {
    const { mic, player, phraseEnds, user, hear } = await practise({
      ...MAJOR_THIRD_UP,
      answer: 'mic',
    });
    await phraseEnds();

    await user.click(screen.getByRole('button', { name: /pause/i }));
    hear([E2, G_SHARP2]); // noodling during the break
    await user.click(screen.getByRole('button', { name: /resume/i }));

    expect(screen.queryByText(/Correct/)).not.toBeInTheDocument();
    expect(player.play).toHaveBeenCalledTimes(2);
    await phraseEnds();
    expect(mic.heard()).toEqual([]);
    hear([E2, G_SHARP2]);
    expect(screen.getByText(/Correct/)).toBeInTheDocument();
  });

  it('plays the phrase again with R', async () => {
    const { player, phraseEnds, user } = await practise({ ...MAJOR_THIRD_UP, answer: 'mic' });
    await phraseEnds();

    await user.keyboard('r');

    expect(player.play).toHaveBeenCalledTimes(2);
  });

  it('reveals the notes to check yourself, without the microphone', async () => {
    const { mic, user } = await practise({ ...MAJOR_THIRD_UP, answer: 'self' });
    expect(mic.start).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /reveal/i }));

    expect(screen.getByText('Major 3rd up')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'One way to play it: E, then A♭.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
  });
});
