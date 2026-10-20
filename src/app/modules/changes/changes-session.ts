import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { matchesStrum } from '../../core/audio/matchers';
import { MicListener, hasStopped } from '../../core/audio/mic-listener';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { Take } from '../../core/practice/take';
import {
  OpenChord,
  PairCard,
  TAKES_KEPT,
  TakeRecord,
  bestPerMinute,
  buildDeck,
  isTakes,
  lengthText,
  passes,
  perMinute,
  settingsProblems,
} from './deck';
import { ChangesSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const CHANGES_MODULE = 'changes';

const SETTINGS_KEY = 'changes:settings';
const STATS_KEY = 'changes:stats';
const TAKES_KEY = 'changes:takes';

/** Seconds counted down before a take, to get your hand on the first chord. */
export const COUNT_IN = 3;

/** How close a strum must sound to the chord: the triads module's default strictness. */
const STRUM_THRESHOLD = 0.8;

/** How often the time left is updated on screen. */
const TICK_MS = 100;

export interface TakeResult {
  readonly changes: number;
  readonly seconds: number;
  readonly perMinute: number;
  /** The pair's best changes per minute before this take; null for its first take. */
  readonly bestBefore: number | null;
  readonly passed: boolean;
}

/**
 * One-minute changes: change between two chords as many times as you can in a minute, counted
 * by the microphone (a fresh strum that matches the next chord) or by a tap for each change.
 */
@Service({ autoProvided: false })
export class ChangesSession implements Drill {
  private readonly mic = inject(MicListener);

  readonly title = 'Chord changes';
  readonly unit = 'take';
  readonly selfCheck = false;
  readonly ownResult = true;

  readonly settings = signal<ChangesSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));
  readonly takes = signal<readonly TakeRecord[]>(loadTakes());

  readonly run = new PracticeRun<PairCard>({
    module: CHANGES_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    // The count is worth a look: wait for Next even after a new best.
    advanceAfterCorrect: false,
    // A take lasts as long as set in setup, whatever you play.
    timesAnswers: false,
    onStart: () => {
      if (this.settings().count === 'mic') {
        void this.mic.start('spectrum');
      }
    },
    onEnd: () => {
      this.take.stop();
      this.mic.stop();
    },
    onNext: () => this.result.set(null),
  });

  /** count-in: 3, 2, 1; running: the take, while changes are counted. */
  private readonly take = new Take<'count-in' | 'running'>({
    run: this.run,
    inputLost: computed(() => this.settings().count === 'mic' && hasStopped(this.mic.status())),
    onStop: () => {
      clearInterval(this.ticker);
      this.target.set(null);
    },
  });
  readonly stage = this.take.stage.asReadonly();
  /** The number shown during the count-in: 3, 2, 1. */
  readonly countIn = signal(0);
  readonly remainingMs = signal(0);
  readonly changes = signal(0);
  /** The chord to play now: the first of the pair, then the other, back and forth. */
  readonly target = signal<OpenChord | null>(null);
  readonly result = signal<TakeResult | null>(null);

  /** The current pair's best changes per minute, or null before its first take. */
  readonly best = computed(() => {
    const card = this.run.current();
    return card ? bestPerMinute(this.takes(), card.key) : null;
  });

  readonly tags = computed(() => {
    const { seconds, count } = this.settings();
    return [lengthText(seconds), count === 'mic' ? 'Counted by the mic' : 'A tap per change'];
  });

  /** Whether the first chord has been played: changes count from there. */
  private landedFirst = false;
  /** The strum count when the target last changed: only a later strum can land the next chord. */
  private strumsBefore = 0;
  private ticker: ReturnType<typeof setInterval> | undefined;

  constructor() {
    // A fresh strum that sounds like the target lands it. A chord still ringing can't, even when
    // the next one shares notes with it (C and Am share two).
    effect(() => {
      const target = this.target();
      const chroma = this.mic.chroma();
      const strums = this.mic.strums();
      if (
        this.stage() === 'running' &&
        this.settings().count === 'mic' &&
        target &&
        strums > this.strumsBefore &&
        chroma !== null &&
        matchesStrum(chroma, target.pitchClasses, STRUM_THRESHOLD)
      ) {
        untracked(() => this.land());
      }
    });
  }

  updateSettings(changes: Partial<ChangesSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Counts down, then runs a take of the current pair. */
  start(): void {
    const card = this.run.current();
    if (!card || !this.take.canStart()) {
      return;
    }
    this.changes.set(0);
    this.landedFirst = false;
    this.target.set(card.first);
    this.take.stage.set('count-in');
    this.countIn.set(COUNT_IN);
    this.run.touch();
    for (let left = COUNT_IN - 1; left >= 1; left--) {
      this.take.after((COUNT_IN - left) * 1000, () => this.countIn.set(left));
    }
    this.take.after(COUNT_IN * 1000, () => this.begin(card));
  }

  /** A tap: you've landed the chord shown. */
  tap(): void {
    if (this.stage() === 'running' && this.settings().count === 'tap') {
      this.land();
    }
  }

  private begin(card: PairCard): void {
    const seconds = this.settings().seconds;
    const endsAt = Date.now() + seconds * 1000;
    this.strumsBefore = this.mic.strums();
    this.take.stage.set('running');
    this.remainingMs.set(seconds * 1000);
    this.run.touch();
    this.ticker = setInterval(
      () => this.remainingMs.set(Math.max(0, endsAt - Date.now())),
      TICK_MS,
    );
    this.take.after(seconds * 1000, () => this.finish(card, seconds));
  }

  /** The chord shown was played: the first one starts the count, each later one is a change. */
  private land(): void {
    const card = this.run.current();
    if (!card) {
      return;
    }
    if (this.landedFirst) {
      this.changes.update((changes) => changes + 1);
    }
    this.landedFirst = true;
    this.strumsBefore = this.mic.strums();
    this.target.update((target) => (target?.id === card.first.id ? card.second : card.first));
    this.run.touch();
  }

  private finish(card: PairCard, seconds: number): void {
    this.take.stop();
    const bestBefore = bestPerMinute(this.takes(), card.key);
    const take: TakeRecord = {
      pair: card.key,
      changes: this.changes(),
      seconds,
      at: Date.now(),
      counted: this.settings().count,
    };
    const rate = perMinute(take);
    const passed = passes(rate, bestBefore);
    this.takes.update((takes) => [...takes, take].slice(-TAKES_KEPT));
    saveJson(TAKES_KEY, this.takes());
    this.result.set({ changes: take.changes, seconds, perMinute: rate, bestBefore, passed });
    this.run.resolve(passed);
  }
}

function loadTakes(): readonly TakeRecord[] {
  const saved = loadJson(TAKES_KEY);
  return isTakes(saved) ? saved : [];
}

/** Providers for the pages: the session, also offered as the `Drill` the shared screens use. */
export function provideChanges(): Provider[] {
  return [ChangesSession, { provide: Drill, useExisting: ChangesSession }];
}
