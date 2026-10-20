import { PitchDetector } from 'pitchy';
import { NOTE_GAP_S, NOTE_S, PhrasePlayer } from './phrase-player';
import { pluck } from './pluck';
import { TestBed } from '@angular/core/testing';

/** The same "random" burst every run. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

function centsBetween(found: number, wanted: number): number {
  return 1200 * Math.log2(found / wanted);
}

describe('pluck', () => {
  it.each([
    ['the low E string', 82.407],
    ['A3', 220],
    ['E5, high on the neck', 659.255],
  ])('rings at the pitch of %s, in tune within a cent', (_note, frequency) => {
    const { sampleRate, samples } = pluck(frequency, 0.8, seeded(7));

    const window = samples.subarray(4096, 8192);
    const [found, clarity] = PitchDetector.forFloat32Array(window.length).findPitch(
      window,
      sampleRate,
    );
    expect(clarity).toBeGreaterThan(0.9);
    expect(Math.abs(centsBetween(found, frequency))).toBeLessThan(1);
  });

  it('starts loud, and fades out to silence by its end', () => {
    const { sampleRate, samples } = pluck(220, 0.8, seeded(7));

    expect(samples.length).toBe(Math.round(sampleRate * 0.8));
    expect(Math.max(...samples.subarray(0, 2000).map(Math.abs))).toBeCloseTo(0.5, 5);
    expect(Math.abs(samples[samples.length - 1])).toBeLessThan(0.001);
  });
});

describe('PhrasePlayer', () => {
  const started: number[] = [];
  const stopped = vi.fn();

  beforeEach(() => {
    started.length = 0;
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.stubGlobal(
      'AudioContext',
      class {
        currentTime = 10;
        destination = {};
        resume = async () => undefined;
        createBuffer = () => ({ copyToChannel: () => undefined });
      },
    );
    vi.stubGlobal(
      'AudioBufferSourceNode',
      class {
        connect = () => undefined;
        start = (time: number) => started.push(time);
        stop = stopped;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('plays the notes one after another, then says the phrase is over', async () => {
    const player = TestBed.inject(PhrasePlayer);

    const done = player.play([45, 49, 52]);

    const offsets = started.map((time) => time - started[0]);
    [0, NOTE_GAP_S, 2 * NOTE_GAP_S].forEach((offset, index) =>
      expect(offsets[index]).toBeCloseTo(offset, 9),
    );
    expect(player.playing()).toBe(true);
    vi.advanceTimersByTime((2 * NOTE_GAP_S + NOTE_S) * 1000 + 100);
    await expect(done).resolves.toBe(true);
    expect(player.playing()).toBe(false);
  });

  it('cuts a phrase short when stopped', async () => {
    const player = TestBed.inject(PhrasePlayer);
    const done = player.play([45, 49]);

    player.stop();

    await expect(done).resolves.toBe(false);
    expect(stopped).toHaveBeenCalledTimes(2);
    expect(player.playing()).toBe(false);
  });
});
