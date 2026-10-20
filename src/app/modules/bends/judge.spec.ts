import { midiToFrequency } from '../../core/audio/note-stream';
import { BendFrame, BendJudge, HOLD_MS, SETTLE_MS } from './judge';

/** G3, bent a whole step to A3. */
const G3 = 55;
const A3 = 57;
const FRAME_MS = 30;

/** A judge for that bend, and a way to play it: a pick, then readings in cents above the G. */
function bending(attacksBefore = 0) {
  const judge = new BendJudge(G3, A3, attacksBefore);
  let attacks = attacksBefore;
  let time = 0;
  const frame = (cents: number | null): BendFrame => ({
    attacks,
    time,
    pitch:
      cents === null
        ? null
        : { frequency: midiToFrequency(G3) * 2 ** (cents / 1200), fading: false, time },
  });
  return {
    judge,
    /** A new pick, heard with whatever still sounds. */
    pick(cents: number | null = null) {
      attacks++;
      return judge.push(frame(cents));
    },
    /** Readings one frame apart, after the pick has settled; returns every result. */
    play(...cents: (number | null)[]) {
      time = Math.max(time, SETTLE_MS);
      return cents.map((value) => {
        const result = judge.push(frame(value));
        time += FRAME_MS;
        return result;
      });
    },
  };
}

/** Readings at `cents` for as long as `ms`. */
function hold(cents: number, ms: number): number[] {
  return Array.from({ length: Math.ceil(ms / FRAME_MS) + 1 }, () => cents);
}

describe('BendJudge', () => {
  it('passes a bend held within 10 cents of the target for half a second', () => {
    const bend = bending();
    bend.pick();

    const results = bend.play(0, 0, 60, 130, 185, ...hold(197, HOLD_MS));

    expect(results.at(-1)).toEqual({ kind: 'held', centsOff: expect.closeTo(-3, 6) });
    expect(results.slice(0, -1).every((result) => result === null)).toBe(true);
    expect(bend.judge.trace.map((point) => Math.round(point.cents)).slice(0, 4)).toEqual([
      0, 0, 60, 130,
    ]);
  });

  it('says how far a bend fell short when the note ends', () => {
    const bend = bending();
    bend.pick();

    const results = bend.play(0, 80, 150, 172, 170, 165, null);

    expect(results.at(-1)).toEqual({ kind: 'missed', centsOff: expect.closeTo(-28, 6) });
  });

  it('says how far a bend went past the target', () => {
    const bend = bending();
    bend.pick();

    expect(bend.play(0, 120, 240, 235, null).at(-1)).toEqual({
      kind: 'missed',
      centsOff: expect.closeTo(40, 6),
    });
  });

  it('needs the bend held, not only reached', () => {
    const bend = bending();
    bend.pick();

    const results = bend.play(0, 120, ...hold(203, HOLD_MS / 2), 150, null);

    expect(results.at(-1)).toEqual({ kind: 'missed', centsOff: expect.closeTo(3, 6) });
  });

  it('ends a bend at the next pick', () => {
    const bend = bending();
    bend.pick();
    bend.play(0, 90, 150);

    expect(bend.pick(150)).toEqual({ kind: 'missed', centsOff: expect.closeTo(-50, 6) });
  });

  it('skips the readings just after a pick, which still hold the note before', () => {
    const bend = bending();
    bend.pick(200);

    expect(bend.judge.push({ attacks: 1, time: SETTLE_MS - 1, pitch: null })).toBeNull();
    expect(bend.play(0, ...hold(200, HOLD_MS)).at(-1)).toMatchObject({ kind: 'held' });
  });

  it('does not take the target note fretted for a bend', () => {
    const bend = bending();
    bend.pick();

    expect(bend.play(200)).toEqual([{ kind: 'fretted' }]);
    expect(bend.play(...hold(200, HOLD_MS)).every((result) => result === null)).toBe(true);
  });

  it('gives no verdict on a note picked and left alone', () => {
    const bend = bending();
    bend.pick();

    expect(bend.play(...hold(0, 1000), null).every((result) => result === null)).toBe(true);
  });

  it('only follows picks made after the bend was asked for', () => {
    const bend = bending(3);

    expect(bend.play(0, 120, ...hold(200, HOLD_MS)).every((result) => result === null)).toBe(true);
  });

  it('ignores picks heard while it was told to skip them', () => {
    const judge = new BendJudge(G3, A3, 0);
    const target = (time: number): BendFrame => ({
      attacks: 1,
      time,
      pitch: { frequency: midiToFrequency(A3), fading: false, time },
    });

    // The target played through the speakers, its pluck heard by the microphone.
    judge.skip(1);

    expect([judge.push(target(500)), judge.push(target(500 + SETTLE_MS))]).toEqual([null, null]);
  });
});
