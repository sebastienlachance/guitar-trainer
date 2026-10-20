import { Provider, Service, computed, inject, signal } from '@angular/core';
import { AudioInputs } from '../../core/audio/audio-inputs';
import { Click, Metronome, clickSchedule } from '../../core/audio/metronome';
import { RhythmListener } from '../../core/audio/rhythm-listener';
import {
  Calibration,
  TakeScore,
  clickLeak,
  estimateLatency,
  hitGap,
  scoreTake,
} from '../../core/audio/timing';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { Take } from '../../core/practice/take';
import { Level, Levels, isLevels, levelOf, nextLevel } from '../../core/practice/tempo-ladder';
import { loadJson, saveJson } from '../../core/practice/storage';
import { plural } from '../../core/ui/text';
import {
  DEFAULT_INPUT,
  RhythmCard,
  TAKES_KEPT,
  TakeRecord,
  buildDeck,
  isTakes,
  settingsProblems,
  struckSlots,
  takePasses,
  takeRecord,
} from './deck';
import { RhythmSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const RHYTHM_MODULE = 'rhythm';

const SETTINGS_KEY = 'rhythm:settings';
const STATS_KEY = 'rhythm:stats';
const LEVELS_KEY = 'rhythm:levels';
const TAKES_KEY = 'rhythm:takes';

/** Calibration: one bar of count-in, then eight beats to strike along with, at 80 bpm. */
const CALIBRATION_BPM = 80;
const CALIBRATION_BEATS = 8;
/** Strikes calibration must hear to trust its measure. */
const CALIBRATION_MIN_HEARD = 6;

/** Time between pressing Play and the first click, for the audio to be scheduled. */
const LEAD_IN_S = 0.3;

export interface TakeResult {
  readonly score: TakeScore;
  readonly passed: boolean;
  readonly bpm: number;
  readonly nextBpm: number;
  /** The tick reached the microphone during the count-in. */
  readonly leak: boolean;
}

/** starting: the microphone is opening; count-in: clicks to listen to; playing: strike along. */
export type CalibrationState =
  | { readonly stage: 'idle' | 'starting' | 'count-in' | 'playing' }
  | { readonly stage: 'done'; readonly result: Calibration; readonly leak: boolean }
  | { readonly stage: 'failed'; readonly heard: number };

/**
 * The play-along rhythm module: strike every subdivision with the metronome, or the strokes of a
 * strumming pattern, and see how early or late each hit was. Each subdivision and pattern climbs
 * its own tempo ladder. The app checks the take.
 */
@Service({ autoProvided: false })
export class RhythmSession implements Drill {
  private readonly listener = inject(RhythmListener);
  private readonly metronome = inject(Metronome);
  private readonly inputs = inject(AudioInputs);

  readonly title = 'Play along';
  readonly unit = 'take';
  readonly selfCheck = false;

  readonly settings = signal<RhythmSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  /** The input that will be listened to, as calibration records it. */
  private readonly input = computed(() => this.inputs.deviceToOpen() ?? DEFAULT_INPUT);
  readonly problems = computed(() => settingsProblems(this.settings(), this.input()));

  readonly levels = signal<Levels>(loadLevels());
  readonly takes = signal<readonly TakeRecord[]>(loadTakes());

  readonly run = new PracticeRun<RhythmCard>({
    module: RHYTHM_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    // The timing of a take is worth reading: wait for Next even after a pass.
    advanceAfterCorrect: false,
    // A take lasts as long as its bars, whatever you play.
    timesAnswers: false,
    onStart: () => void this.listener.start(),
    onEnd: () => {
      this.take.stop();
      this.cancelCalibration();
      this.listener.stop();
    },
    onNext: () => this.result.set(null),
  });

  /** count-in: a bar of clicks to listen to; playing: the take itself. */
  private readonly take = new Take<'count-in' | 'playing'>({
    run: this.run,
    inputLost: computed(() => this.listener.status() !== 'listening'),
    onStop: () => this.metronome.stop(),
  });
  readonly stage = this.take.stage.asReadonly();
  readonly result = signal<TakeResult | null>(null);
  readonly calibration = signal<CalibrationState>({ stage: 'idle' });
  readonly calibrating = computed(() => {
    const stage = this.calibration().stage;
    return stage === 'starting' || stage === 'count-in' || stage === 'playing';
  });

  /** The current card's tempo, where its ladder stands. */
  readonly tempo = computed(() => {
    const card = this.run.current();
    return card ? this.levelFor(card).bpm : 0;
  });

  readonly tags = computed(() => {
    const { subdivisions, patterns, bars, click } = this.settings();
    return [
      ...(subdivisions.length > 0 ? [plural(subdivisions.length, 'subdivision')] : []),
      ...(patterns.length > 0 ? [plural(patterns.length, 'pattern')] : []),
      plural(bars, 'bar'),
      click === 'sound' ? 'Tick and light' : 'Light only',
    ];
  });

  private calibrationTimers: ReturnType<typeof setTimeout>[] = [];

  updateSettings(changes: Partial<RhythmSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Plays a take of the current card: a bar of count-in, then the bars to strike along with. */
  async play(): Promise<void> {
    const card = this.run.current();
    if (!card) {
      return;
    }
    const context = await this.take.prepare(() => this.listen());
    if (!context) {
      return;
    }
    const bpm = this.tempo();
    const perBeat = card.subdivision.perBeat;
    const countIn = clickSchedule(this.listener.now() + LEAD_IN_S, bpm, 1, 1);
    const takeStart = countIn[0].time + (4 * 60) / bpm;
    const take = clickSchedule(takeStart, bpm, perBeat, this.settings().bars);
    this.metronome.play(context, [...countIn, ...take], this.settings().click === 'sound');
    this.take.stage.set('count-in');
    this.run.touch();
    this.take.after(this.msUntil(takeStart), () => this.take.stage.set('playing'));
    const gap = hitGap(bpm, perBeat);
    this.take.after(this.msUntil(this.settleTime(take, gap)), () =>
      this.finishTake(card, bpm, countIn, take, gap),
    );
  }

  /** Measures the delay from the metronome to your strikes, and saves it. */
  async calibrate(): Promise<void> {
    if (this.calibrating() || this.run.current()) {
      return;
    }
    this.calibration.set({ stage: 'starting' });
    const context = await this.listen();
    if (this.calibration().stage !== 'starting') {
      // Cancelled while the microphone opened.
      return;
    }
    if (!context) {
      this.calibration.set({ stage: 'idle' });
      return;
    }
    const clicks = clickSchedule(this.listener.now() + LEAD_IN_S, CALIBRATION_BPM, 1, 3);
    const countIn = clicks.slice(0, 4);
    const played = clicks.slice(4, 4 + CALIBRATION_BEATS);
    const click = this.settings().click;
    this.metronome.play(context, clicks.slice(0, 4 + CALIBRATION_BEATS), click === 'sound');
    this.calibration.set({ stage: 'count-in' });
    this.calibrationAt(played[0].time, () => this.calibration.set({ stage: 'playing' }));
    const gap = hitGap(CALIBRATION_BPM, 1);
    this.calibrationAt(this.settleTime(played, gap), () => {
      this.calibrationTimers = [];
      const strikes = this.listener.strikes();
      const result = estimateLatency(
        played.map((click) => click.time),
        strikes,
      );
      if (result.matched < CALIBRATION_MIN_HEARD) {
        this.calibration.set({ stage: 'failed', heard: result.matched });
      } else {
        this.updateSettings({
          latencyMs: Math.round(result.latencyMs),
          latencyInput: this.input(),
          latencyClick: click,
        });
        this.calibration.set({
          stage: 'done',
          result,
          leak: clickLeak(
            countIn.map((click) => click.time),
            strikes,
          ),
        });
      }
      // Calibration happens in setup, outside a session: let the microphone go.
      this.listener.stop();
    });
  }

  /** Stops a calibration under way, as when leaving setup or starting a session. */
  cancelCalibration(): void {
    if (!this.calibrating()) {
      return;
    }
    this.calibrationTimers.forEach(clearTimeout);
    this.calibrationTimers = [];
    this.metronome.stop();
    this.calibration.set({ stage: 'idle' });
    if (!this.run.current()) {
      this.listener.stop();
    }
  }

  private finishTake(
    card: RhythmCard,
    bpm: number,
    countIn: readonly Click[],
    take: readonly Click[],
    gap: number,
  ): void {
    const latencyMs = this.settings().latencyMs ?? 0;
    const strikes = this.listener.strikes();
    // Strikes reach the microphone `latencyMs` after they're played; scoring takes that off.
    const takeBegins = take[0].time - gap / 2 + latencyMs / 1000;
    const takeEnds = take[take.length - 1].time + gap / 2 + latencyMs / 1000;
    const takeStrikes = strikes.filter((strike) => strike >= takeBegins && strike < takeEnds);
    // A pattern is scored on its strokes; a strike in one of its rests matches none of them.
    const struck = struckSlots(card);
    const expected = take
      .filter((_, index) => struck[index % struck.length])
      .map((click) => click.time);
    const score = scoreTake(expected, takeStrikes, latencyMs, gap);
    const passed = takePasses(score, card, this.settings().bars);
    const level = this.levelFor(card);
    const next = nextLevel(level, passed);
    this.levels.update((levels) => ({ ...levels, [card.key]: next }));
    saveJson(LEVELS_KEY, this.levels());
    this.takes.update((takes) =>
      [...takes, takeRecord(card, bpm, score, passed, Date.now())].slice(-TAKES_KEPT),
    );
    saveJson(TAKES_KEY, this.takes());
    this.result.set({
      score,
      passed,
      bpm,
      nextBpm: next.bpm,
      leak: clickLeak(
        countIn.map((click) => click.time),
        strikes.filter((strike) => strike < takeBegins),
      ),
    });
    this.take.stop();
    this.run.resolve(passed);
  }

  private levelFor(card: RhythmCard): Level {
    return levelOf(this.levels(), card.key, this.settings().startTempo);
  }

  /** Starts the microphone if needed; the audio context once it listens, else null. */
  private async listen(): Promise<AudioContext | null> {
    await this.listener.start();
    this.listener.clearStrikes();
    return this.listener.context;
  }

  /**
   * When all strikes of a run of clicks are in: the last click, plus half a gap for a late
   * strike, plus the latency, plus the attack timer's 12 ms of reporting delay and some margin.
   */
  private settleTime(clicks: readonly Click[], gap: number): number {
    const latency = Math.max(0, this.settings().latencyMs ?? 0) / 1000;
    return clicks[clicks.length - 1].time + gap / 2 + latency + 0.1;
  }

  /** Milliseconds from now to a time on the audio clock. */
  private msUntil(time: number): number {
    return Math.max(0, (time - this.listener.now()) * 1000);
  }

  private calibrationAt(time: number, action: () => void): void {
    this.calibrationTimers.push(setTimeout(action, this.msUntil(time)));
  }
}

function loadLevels(): Levels {
  const saved = loadJson(LEVELS_KEY);
  return isLevels(saved) ? saved : {};
}

function loadTakes(): readonly TakeRecord[] {
  const saved = loadJson(TAKES_KEY);
  return isTakes(saved) ? saved : [];
}

/** Providers for the rhythm pages: the session, also offered as the `Drill` the shared screens use. */
export function provideRhythm(): Provider[] {
  return [RhythmSession, { provide: Drill, useExisting: RhythmSession }];
}
