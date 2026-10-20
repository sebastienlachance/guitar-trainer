import { STANDARD_TUNING, STRING_NUMBERS } from '../fretboard/tuning';
import { DEFAULT_NOTE_STREAM_OPTIONS, PitchFrame } from './note-stream';

/** Concert pitch: the A above middle C, in Hz. */
export const A4_HZ = 440;

/** Close enough to call a string in tune: a few cents is below what most ears can tell apart. */
export const IN_TUNE_CENTS = 5;

/** How long a string must stay in tune to be ticked off. */
export const SETTLE_MS = 1000;

/** How long the last reading stays after the note fades, to read it while turning the peg. */
export const HOLD_MS = 1000;

/** A tuner needs cleaner input than note matching: a blurred reading would move the needle. */
const MIN_CLARITY = 0.9;

/** Low enough for a string tuned down (drop D is 73 Hz), up to the high frets. */
const MIN_HZ = 60;
const MAX_HZ = 1400;

/**
 * Readings combined into one: the middle of the last 7 (about 200 ms). One disturbance (a click,
 * a scrape of the pick) spoils every reading whose window holds it, 3 in a row: with 7, the
 * middle one is still a clean reading.
 */
const SMOOTHING_FRAMES = 7;

/** A gap this short (a frame or two) is a blur in a note still ringing, not its end. */
const GRACE_MS = 90;

/**
 * Readings skipped at the start of a note: about one pitch window (85 ms), which still holds the
 * silence or the attack before it and reads off by several cents.
 */
const ONSET_MS = 90;

/** How far an open string can be off and still be advised on: a semitone either way. */
const ADVICE_RANGE_CENTS = 100;

/** The nearest note to a frequency, and how far off it is. */
export interface PitchReading {
  readonly frequency: number;
  /** The nearest note, as a MIDI number. */
  readonly midi: number;
  /** Hundredths of a semitone from that note, from −50 (flat) to +50 (sharp). */
  readonly cents: number;
}

export function readPitch(frequency: number): PitchReading {
  const exact = exactMidi(frequency);
  const midi = Math.round(exact);
  return { frequency, midi, cents: (exact - midi) * 100 };
}

/** The MIDI number with decimals: 44.8 is an A2 (45) 20 cents flat. */
function exactMidi(frequency: number): number {
  return 69 + 12 * Math.log2(frequency / A4_HZ);
}

export type TuneDirection = 'up' | 'down' | 'in-tune';

/** The open string a pitch belongs to in standard tuning, and which way to turn its peg. */
export interface TuneAdvice {
  /** String number, from 1 (high E) to 6 (low E). */
  readonly string: number;
  readonly direction: TuneDirection;
}

/**
 * Advice for the open string nearest the pitch, or null when no string is within a semitone:
 * then the note is shown without advice, since the string meant can't be told.
 */
export function tuneAdvice(frequency: number): TuneAdvice | null {
  const exact = exactMidi(frequency);
  const string = STRING_NUMBERS.reduce((best, candidate) =>
    Math.abs(exact - openNote(candidate)) < Math.abs(exact - openNote(best)) ? candidate : best,
  );
  const offset = (exact - openNote(string)) * 100;
  if (Math.abs(offset) > ADVICE_RANGE_CENTS) {
    return null;
  }
  const direction = Math.abs(offset) <= IN_TUNE_CENTS ? 'in-tune' : offset < 0 ? 'up' : 'down';
  return { string, direction };
}

/** The note an open string is tuned to, as a MIDI number. */
export function openNote(string: number): number {
  return STANDARD_TUNING[string - 1];
}

/** What the tuner shows: a steadied frequency, or the last one while the note fades. */
export interface TunerPitch {
  readonly frequency: number;
  /** The note has stopped: this is the last reading, held for a moment. */
  readonly fading: boolean;
  /** When this was read, in milliseconds on the frames' clock. */
  readonly time: number;
}

/**
 * Steadies raw pitch frames for the tuner: the middle of the last few readings, so jitter and
 * an odd octave slip don't move the needle, held for a moment after the note fades.
 */
export class PitchSmoother {
  private recent: number[] = [];
  /** When the note being read started, or null between notes. */
  private noteStart: number | null = null;
  private last: { frequency: number; time: number } | null = null;

  push(frame: PitchFrame): TunerPitch | null {
    const { time } = frame;
    if (isClear(frame)) {
      this.noteStart ??= time;
      if (time - this.noteStart >= ONSET_MS) {
        this.recent = [...this.recent, frame.frequency].slice(-SMOOTHING_FRAMES);
        this.last = { frequency: median(this.recent), time };
      }
    } else if (!this.last || time - this.last.time > GRACE_MS) {
      // The note has ended: the next one starts afresh.
      this.recent = [];
      this.noteStart = null;
    }
    return this.shown(time);
  }

  /** The last reading, fading once the note stops, until it has been gone for `HOLD_MS`. */
  private shown(time: number): TunerPitch | null {
    if (!this.last) {
      return null;
    }
    const silentFor = time - this.last.time;
    if (silentFor > HOLD_MS) {
      this.last = null;
      return null;
    }
    return { frequency: this.last.frequency, fading: silentFor > GRACE_MS, time };
  }
}

function isClear(frame: PitchFrame): boolean {
  return (
    frame.level >= DEFAULT_NOTE_STREAM_OPTIONS.minLevel &&
    frame.clarity >= MIN_CLARITY &&
    frame.frequency >= MIN_HZ &&
    frame.frequency <= MAX_HZ
  );
}

/** The middle value; of an even count, the lower middle one rather than a blend of two. */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/** Ticks off each string once it has stayed in tune for `SETTLE_MS`. */
export class TunedStrings {
  private holding: { string: number; since: number } | null = null;
  private readonly tuned = new Set<number>();

  /**
   * Records the advice for what is heard at `time` (null while nothing is, or the note fades).
   * Returns the string this completes, or null.
   */
  push(advice: TuneAdvice | null, time: number): number | null {
    if (advice?.direction !== 'in-tune') {
      this.holding = null;
      return null;
    }
    if (this.holding?.string !== advice.string) {
      this.holding = { string: advice.string, since: time };
    }
    if (time - this.holding.since < SETTLE_MS || this.tuned.has(advice.string)) {
      return null;
    }
    this.tuned.add(advice.string);
    return advice.string;
  }
}
