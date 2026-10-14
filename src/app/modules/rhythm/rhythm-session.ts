import { Provider, Service, computed, inject, signal } from '@angular/core';
import { Click, Metronome, clickSchedule } from '../../core/audio/metronome';
import { RhythmListener } from '../../core/audio/rhythm-listener';
import {
  Calibration,
  TakeScore,
  clickLeak,
  estimateLatency,
  hitGap,
  passes,
  scoreTake,
} from '../../core/audio/timing';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { plural } from '../../core/ui/text';
import {
  Level,
  Levels,
  RhythmCard,
  TAKES_KEPT,
  TakeRecord,
  buildDeck,
  isLevels,
  isTakes,
  levelOf,
  nextLevel,
  settingsProblems,
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

/** count-in: a bar of clicks to listen to; playing: the take itself. */
export type TakeStage = 'idle' | 'count-in' | 'playing';

export interface TakeResult {
  readonly score: TakeScore;
  readonly passed: boolean;
  readonly bpm: number;
  readonly nextBpm: number;
  /** The tick reached the microphone during the count-in. */
  readonly leak: boolean;
}

export type CalibrationState =
  | { readonly stage: 'idle' | 'count-in' | 'playing' }
  | { readonly stage: 'done'; readonly result: Calibration; readonly leak: boolean }
  | { readonly stage: 'failed'; readonly heard: number };

/**
 * The play-along rhythm module: strike every subdivision with the metronome, and see how early
 * or late each hit was. Each subdivision climbs its own tempo ladder. The app checks the take.
 */
@Service({ autoProvided: false })
export class RhythmSession implements Drill {
  private readonly listener = inject(RhythmListener);
  private readonly metronome = inject(Metronome);

  readonly title = 'Play along';
  readonly unit = 'take';
  readonly selfCheck = false;

  readonly settings = signal<RhythmSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));

  readonly levels = signal<Levels>(loadLevels());
  readonly takes = signal<readonly TakeRecord[]>(loadTakes());

  readonly run = new PracticeRun<RhythmCard>({
    module: RHYTHM_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    // The timing of a take is worth reading: wait for Next even after a pass.
    advanceAfterCorrect: false,
    onStart: () => void this.listener.start(),
    onEnd: () => {
      this.cancel();
      this.listener.stop();
    },
    onNext: () => this.result.set(null),
  });

  readonly stage = signal<TakeStage>('idle');
  readonly result = signal<TakeResult | null>(null);
  readonly calibration = signal<CalibrationState>({ stage: 'idle' });

  /** The current card's tempo, where its ladder stands. */
  readonly tempo = computed(() => {
    const card = this.run.current();
    return card ? this.levelFor(card).bpm : 0;
  });

  readonly tags = computed(() => {
    const { subdivisions, bars, click } = this.settings();
    return [
      plural(subdivisions.length, 'subdivision'),
      plural(bars, 'bar'),
      click === 'sound' ? 'Tick and light' : 'Light only',
    ];
  });

  private timers: ReturnType<typeof setTimeout>[] = [];

  updateSettings(changes: Partial<RhythmSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Plays a take of the current card: a bar of count-in, then the bars to strike along with. */
  async play(): Promise<void> {
    const card = this.run.current();
    if (!card || this.run.phase() !== 'prompt' || this.stage() !== 'idle') {
      return;
    }
    const context = await this.listen();
    if (!context) {
      return;
    }
    const bpm = this.tempo();
    const perBeat = card.subdivision.perBeat;
    const countIn = clickSchedule(this.listener.now() + LEAD_IN_S, bpm, 1, 1);
    const takeStart = countIn[0].time + (4 * 60) / bpm;
    const take = clickSchedule(takeStart, bpm, perBeat, this.settings().bars);
    this.metronome.play(context, [...countIn, ...take], this.settings().click === 'sound');
    this.stage.set('count-in');
    this.run.touch();
    this.at(takeStart, () => this.stage.set('playing'));
    const gap = hitGap(bpm, perBeat);
    this.at(this.settleTime(take, gap), () => this.finishTake(card, bpm, countIn, take, gap));
  }

  /** Measures the delay from the metronome to your strikes, and saves it. */
  async calibrate(): Promise<void> {
    if (this.calibration().stage === 'count-in' || this.calibration().stage === 'playing') {
      return;
    }
    const context = await this.listen();
    if (!context) {
      return;
    }
    const clicks = clickSchedule(this.listener.now() + LEAD_IN_S, CALIBRATION_BPM, 1, 3);
    const countIn = clicks.slice(0, 4);
    const played = clicks.slice(4, 4 + CALIBRATION_BEATS);
    this.metronome.play(
      context,
      clicks.slice(0, 4 + CALIBRATION_BEATS),
      this.settings().click === 'sound',
    );
    this.calibration.set({ stage: 'count-in' });
    this.at(played[0].time, () => this.calibration.set({ stage: 'playing' }));
    const gap = hitGap(CALIBRATION_BPM, 1);
    this.at(this.settleTime(played, gap), () => {
      const strikes = this.listener.strikes();
      const result = estimateLatency(
        played.map((click) => click.time),
        strikes,
      );
      if (result.matched < CALIBRATION_MIN_HEARD) {
        this.calibration.set({ stage: 'failed', heard: result.matched });
      } else {
        this.updateSettings({ latencyMs: Math.round(result.latencyMs) });
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
      if (!this.run.current()) {
        this.listener.stop();
      }
    });
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
    const takeStrikes = strikes.filter((strike) => strike >= takeBegins);
    const score = scoreTake(
      take.map((click) => click.time),
      takeStrikes,
      latencyMs,
      gap,
    );
    const passed = passes(score);
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
    this.stage.set('idle');
    this.run.resolve(passed);
  }

  private levelFor(card: RhythmCard): Level {
    return levelOf(this.levels(), card, this.settings().startTempo);
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

  /** Runs an action at a time on the audio clock. */
  private at(time: number, action: () => void): void {
    const delay = Math.max(0, (time - this.listener.now()) * 1000);
    this.timers.push(setTimeout(action, delay));
  }

  private cancel(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.metronome.stop();
    this.stage.set('idle');
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
