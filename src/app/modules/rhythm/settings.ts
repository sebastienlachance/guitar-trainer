import { pickList, pickOne, savedFields } from '../../core/practice/saved-settings';

/** sound: a tick and the light; light: the light only, for when the tick would bother the mic. */
export type ClickMode = 'sound' | 'light';

export const SUBDIVISION_IDS: readonly string[] = ['quarter', 'eighth', 'triplet', 'sixteenth'];
/** Strumming pattern ids, from `PATTERNS` in deck.ts. */
export const PATTERN_IDS: readonly string[] = ['campfire', 'pop', 'offbeat', 'gallop', 'shuffle'];
export const START_TEMPO_CHOICES: readonly number[] = [60, 70, 80, 90, 100];
export const BAR_CHOICES: readonly number[] = [2, 4];

export interface RhythmSettings {
  readonly subdivisions: readonly string[];
  /** Strumming patterns, each a card of its own like a subdivision. */
  readonly patterns: readonly string[];
  /** Tempo a subdivision starts at, before its ladder moves it. */
  readonly startTempo: number;
  /** Bars played in each take, after a bar of count-in. */
  readonly bars: number;
  readonly click: ClickMode;
  /** Delay from the metronome to your strike as the mic hears it, measured by calibration. */
  readonly latencyMs: number | null;
  /** The input calibration measured ('default' or an input id): another one has another delay. */
  readonly latencyInput: string | null;
}

export const DEFAULT_SETTINGS: RhythmSettings = {
  subdivisions: ['quarter', 'eighth'],
  patterns: [],
  startTempo: 70,
  bars: 4,
  click: 'sound',
  latencyMs: null,
  latencyInput: null,
};

/** Calibration results outside this range mean something went wrong, not a real delay. */
const LATENCY_RANGE = { min: -200, max: 800 };

/** Rebuilds settings from saved data, keeping only the values this version knows. */
export function sanitizeSettings(saved: unknown): RhythmSettings {
  const raw = savedFields(saved);
  const defaults = DEFAULT_SETTINGS;
  const latency = raw['latencyMs'];
  const latencyInput = raw['latencyInput'];
  return {
    subdivisions: pickList(raw['subdivisions'], SUBDIVISION_IDS, defaults.subdivisions),
    patterns: pickList(raw['patterns'], PATTERN_IDS, defaults.patterns),
    startTempo: pickOne(raw['startTempo'], START_TEMPO_CHOICES, defaults.startTempo),
    bars: pickOne(raw['bars'], BAR_CHOICES, defaults.bars),
    click: pickOne(raw['click'], ['sound', 'light'], defaults.click),
    latencyMs:
      typeof latency === 'number' && latency >= LATENCY_RANGE.min && latency <= LATENCY_RANGE.max
        ? latency
        : null,
    latencyInput: typeof latencyInput === 'string' ? latencyInput : null,
  };
}
