import { PitchFrame } from './note-stream';
import { HOLD_MS, PitchSmoother, SETTLE_MS, TunedStrings, readPitch, tuneAdvice } from './tuner';

/** A frequency `cents` away from `hz`. */
function detune(hz: number, cents: number): number {
  return hz * 2 ** (cents / 1200);
}

const A2 = 110;
const E2 = 82.407;
const E4 = 329.628;
const G_SHARP2 = 103.826;
const F_SHARP2 = 92.499;

describe('readPitch', () => {
  it('names the nearest note and how many cents off it is', () => {
    expect(readPitch(440)).toMatchObject({ midi: 69, cents: 0 });

    const flat = readPitch(detune(A2, -20));
    expect(flat.midi).toBe(45);
    expect(flat.cents).toBeCloseTo(-20, 6);

    const sharp = readPitch(detune(A2, 49));
    expect(sharp.midi).toBe(45);
    expect(sharp.cents).toBeCloseTo(49, 6);
  });

  it('switches to the next note past half a semitone', () => {
    const reading = readPitch(detune(A2, 51));

    expect(reading.midi).toBe(46);
    expect(reading.cents).toBeCloseTo(-49, 6);
  });
});

describe('tuneAdvice', () => {
  it('says which way to turn the peg of the nearest string', () => {
    expect(tuneAdvice(detune(A2, -20))).toEqual({ string: 5, direction: 'up' });
    expect(tuneAdvice(detune(E2, 10))).toEqual({ string: 6, direction: 'down' });
  });

  it('calls a string in tune within 5 cents', () => {
    expect(tuneAdvice(detune(A2, 4.9))).toEqual({ string: 5, direction: 'in-tune' });
    expect(tuneAdvice(detune(A2, -5.1))).toEqual({ string: 5, direction: 'up' });
    expect(tuneAdvice(E4)).toEqual({ string: 1, direction: 'in-tune' });
  });

  it('still guides a string tuned up to a semitone off', () => {
    expect(tuneAdvice(detune(G_SHARP2, 30))).toEqual({ string: 5, direction: 'up' });
  });

  it('gives no advice for a note far from every open string', () => {
    expect(tuneAdvice(F_SHARP2)).toBeNull();
  });
});

describe('PitchSmoother', () => {
  const FRAME_MS = 30;

  function frame(frequency: number, time: number, changes: Partial<PitchFrame> = {}): PitchFrame {
    return { frequency, time, clarity: 0.95, level: 0.05, ...changes };
  }

  /** Plays one reading per frame of each frequency in turn, from `start`; returns the last result. */
  function play(smoother: PitchSmoother, frequencies: number[], start = 0) {
    return frequencies
      .map((frequency, index) => smoother.push(frame(frequency, start + index * FRAME_MS)))
      .at(-1);
  }

  it('skips the start of a note, read partly over the silence before it', () => {
    const smoother = new PitchSmoother();

    expect(play(smoother, [104, 107, 109])).toBeNull();
    expect(smoother.push(frame(110, 90))).toEqual({ frequency: 110, fading: false, time: 90 });
  });

  it('takes the middle of the last readings, so a disturbance does not move the needle', () => {
    const smoother = new PitchSmoother();
    play(smoother, [110, 110, 110, 110, 110, 110, 110]);

    // A click spoils the 3 readings whose window holds it; here they read an octave up.
    expect(play(smoother, [220, 220, 220], 210)).toMatchObject({ frequency: 110 });
  });

  it.each([
    ['unclear', { clarity: 0.8 }],
    ['too quiet', { level: 0.001 }],
    ['below a guitar', { frequency: 40 }],
  ])('ignores frames %s, however long they last', (_kind, changes: Partial<PitchFrame>) => {
    const smoother = new PitchSmoother();
    const times = [0, 30, 60, 90, 120, 150];

    expect(times.map((time) => smoother.push(frame(110, time, changes)))).toEqual(
      times.map(() => null),
    );
  });

  it('rides out a moment of blur in a note still ringing', () => {
    const smoother = new PitchSmoother();
    play(smoother, [110, 110, 110, 110]);

    expect(smoother.push(frame(0, 120, { clarity: 0.3 }))).toEqual({
      frequency: 110,
      fading: false,
      time: 120,
    });
  });

  it('holds the last reading while the note fades, then lets go', () => {
    const smoother = new PitchSmoother();
    play(smoother, [110, 110, 110, 110]);

    expect(smoother.push(frame(0, 300, { level: 0 }))).toMatchObject({
      frequency: 110,
      fading: true,
    });
    expect(smoother.push(frame(0, 90 + HOLD_MS, { level: 0 }))).toMatchObject({ fading: true });
    expect(smoother.push(frame(0, 90 + HOLD_MS + FRAME_MS, { level: 0 }))).toBeNull();
  });

  it('reads the next note afresh once the last one has faded', () => {
    const smoother = new PitchSmoother();
    play(smoother, [110, 110, 110, 110]);
    smoother.push(frame(0, 300, { level: 0 }));

    expect(play(smoother, [146.8, 146.8, 146.8], 400)).toMatchObject({
      frequency: 110,
      fading: true,
    });
    expect(smoother.push(frame(146.8, 490))).toMatchObject({ frequency: 146.8, fading: false });
  });
});

describe('TunedStrings', () => {
  const IN_TUNE = { string: 5, direction: 'in-tune' } as const;

  it('ticks a string off once it has stayed in tune for a second, and only once', () => {
    const tuned = new TunedStrings();

    expect(tuned.push(IN_TUNE, 0)).toBeNull();
    expect(tuned.push(IN_TUNE, SETTLE_MS - 1)).toBeNull();
    expect(tuned.push(IN_TUNE, SETTLE_MS)).toBe(5);
    expect(tuned.push(IN_TUNE, SETTLE_MS + 30)).toBeNull();
  });

  it('starts the second over when the string drifts or the note fades', () => {
    const tuned = new TunedStrings();
    tuned.push(IN_TUNE, 0);
    tuned.push({ string: 5, direction: 'up' }, 500);
    tuned.push(IN_TUNE, 600);
    tuned.push(null, 700);
    tuned.push(IN_TUNE, 800);

    expect(tuned.push(IN_TUNE, 1700)).toBeNull();
    expect(tuned.push(IN_TUNE, 800 + SETTLE_MS)).toBe(5);
  });
});
