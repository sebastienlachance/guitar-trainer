import { DestroyRef, Signal, computed, effect, inject, signal, untracked } from '@angular/core';
import { PracticeLog } from './practice-log';
import { pickNextCard } from './scheduler';
import { SessionRecord } from './session-log';
import { StatsStore } from './stats-store';

export interface PracticeCard {
  /** Identifies the card in stats; stable across sessions. */
  readonly key: string;
}

/**
 * prompt: waiting for your answer; revealed: you looked at the answer and now judge yourself;
 * answered: the app checked your answer.
 */
export type PracticePhase = 'prompt' | 'revealed' | 'answered';

/**
 * blocked: the settings leave nothing to practise; ready: no session yet; running and paused:
 * a session is open; ended: showing the summary of the session that just finished.
 */
export type PracticeView = 'blocked' | 'ready' | 'running' | 'paused' | 'ended';

export interface PracticeRunOptions<C extends PracticeCard> {
  /** Tags this module's sessions in the shared practice log, e.g. "triads". */
  readonly module: string;
  readonly statsKey: string;
  readonly deck: Signal<readonly C[]>;
  /** Reasons the settings leave nothing to practise; empty when ready. */
  readonly problems: Signal<readonly string[]>;
  /** Runs when a session starts, e.g. to open the microphone. */
  readonly onStart?: () => void;
  readonly onEnd?: () => void;
  /** Runs each time a new card is shown. */
  readonly onNext?: () => void;
  /**
   * Time to answer each card, or null for no limit. When it runs out, the card counts as a miss
   * and the answer shows. The countdown stops while paused and starts over on resume.
   */
  readonly timeLimitMs?: Signal<number | null>;
  /**
   * Moves on by itself after a correct checked answer (the default). Turn it off when the result
   * is worth reading, like a rhythm take's timing; Next then moves on, as after a wrong answer.
   */
  readonly advanceAfterCorrect?: boolean;
}

/** A running countdown for the current card, for drawing it. */
export interface Countdown {
  /** Epoch milliseconds; a new value means a new countdown. */
  readonly startedAt: number;
  readonly ms: number;
}

/** Pause on a correct answer the app checked, before the next card. */
export const AUTO_ADVANCE_MS = 1500;

/**
 * The card-by-card flow every module shares: picking cards (favouring the ones you miss or answer
 * slowly), revealing, recording answers in the stats and the practice log, an optional time
 * limit, and the session around it.
 * Create it as a field of a module service, since it injects the practice log.
 */
export class PracticeRun<C extends PracticeCard> {
  private readonly log = inject(PracticeLog);
  private readonly statsStore: StatsStore;

  readonly stats: StatsStore['stats'];
  readonly current = signal<C | null>(null);
  readonly phase = signal<PracticePhase>('prompt');
  /** Time from the prompt to the reveal or to the checked answer. */
  readonly responseMs = signal<number | null>(null);
  /** Result of the last answer the app checked; null after a self-checked one. */
  readonly lastCorrect = signal<boolean | null>(null);
  /**
   * The card answered by `resolveAndMoveOn()`, while the next one is on screen, for a brief
   * confirmation. Null after any other way of moving on.
   */
  readonly movedOn = signal<{ readonly card: C; readonly responseMs: number } | null>(null);
  /** Whether the current card's answer is a miss because the time limit ran out. */
  readonly timedOut = signal(false);
  /** The time limit counting down on the current card, if there is one. */
  readonly countdown = signal<Countdown | null>(null);
  /** The session that just ended, for the summary; cleared when a new one starts. */
  readonly lastSession = signal<SessionRecord | null>(null);
  readonly paused: Signal<boolean> = this.log.paused;

  readonly view = computed((): PracticeView => {
    if (this.current()) {
      return this.paused() ? 'paused' : 'running';
    }
    if (this.lastSession()) {
      return 'ended';
    }
    return this.options.problems().length > 0 ? 'blocked' : 'ready';
  });

  private shownAt = 0;
  private advanceTimer: ReturnType<typeof setTimeout> | undefined;
  /** Goes up with every card shown, even when the same card comes back (a one-card deck). */
  private readonly cardsShown = signal(0);

  constructor(private readonly options: PracticeRunOptions<C>) {
    this.statsStore = new StatsStore(options.statsKey);
    this.stats = this.statsStore.stats;
    inject(DestroyRef).onDestroy(() => this.end());
    const timeLimitMs = options.timeLimitMs;
    if (timeLimitMs) {
      effect((onCleanup) => {
        const limit = timeLimitMs();
        this.cardsShown();
        const waiting = this.current() !== null && this.phase() === 'prompt' && !this.paused();
        if (limit === null || !waiting) {
          untracked(() => this.countdown.set(null));
          return;
        }
        untracked(() => this.countdown.set({ startedAt: Date.now(), ms: limit }));
        const timer = setTimeout(() => this.timeOut(), limit);
        onCleanup(() => clearTimeout(timer));
      });
    }
  }

  get module(): string {
    return this.options.module;
  }

  get deckSize(): number {
    return this.options.deck().length;
  }

  get problems(): readonly string[] {
    return this.options.problems();
  }

  /** Starts a timed session; returns false when the settings leave nothing to practise. */
  start(): boolean {
    this.end();
    this.lastSession.set(null);
    if (this.options.problems().length > 0) {
      return false;
    }
    this.options.onStart?.();
    this.log.start(this.options.module);
    this.next();
    return true;
  }

  /** Ends the session, if one is running, and keeps its summary in `lastSession`. */
  end(): void {
    clearTimeout(this.advanceTimer);
    this.options.onEnd?.();
    if (this.current() && this.log.current()?.module === this.options.module) {
      this.lastSession.set(this.log.end());
    }
    this.current.set(null);
  }

  /** Shows the answer so you can judge yourself. */
  reveal(): void {
    if (this.phase() === 'prompt') {
      this.log.touch();
      this.responseMs.set(Date.now() - this.shownAt);
      this.phase.set('revealed');
    }
  }

  /** Your own verdict after revealing the answer; moves straight on to the next card. */
  selfCheck(correct: boolean): void {
    const card = this.current();
    if (card && this.phase() === 'revealed') {
      this.record(card, correct, this.responseMs() ?? 0);
      this.next();
    }
  }

  /**
   * The app's verdict on your answer. A correct answer moves on by itself after a moment; a wrong
   * one waits for `next()`, so there is time to study the correction.
   */
  resolve(correct: boolean): void {
    const card = this.current();
    if (!card || this.phase() !== 'prompt') {
      return;
    }
    const responseMs = Date.now() - this.shownAt;
    this.record(card, correct, responseMs);
    this.responseMs.set(responseMs);
    this.lastCorrect.set(correct);
    this.phase.set('answered');
    if (correct && this.options.advanceAfterCorrect !== false) {
      this.advanceTimer = setTimeout(() => this.next(), AUTO_ADVANCE_MS);
    }
  }

  /**
   * A correct answer the app checked, when the answer isn't worth a look (the triads microphone):
   * records it and shows the next card straight away. `movedOn` keeps it for a confirmation.
   */
  resolveAndMoveOn(): void {
    const card = this.current();
    if (!card || this.phase() !== 'prompt') {
      return;
    }
    const responseMs = Date.now() - this.shownAt;
    this.record(card, true, responseMs);
    this.next();
    this.movedOn.set({ card, responseMs });
  }

  next(): void {
    clearTimeout(this.advanceTimer);
    this.movedOn.set(null);
    this.timedOut.set(false);
    const previous = this.current();
    this.current.set(pickNextCard(this.options.deck(), this.stats(), previous?.key ?? null));
    this.phase.set('prompt');
    this.responseMs.set(null);
    this.lastCorrect.set(null);
    this.options.onNext?.();
    this.shownAt = Date.now();
    this.cardsShown.update((count) => count + 1);
  }

  /** Something showed you're practising, such as a played note. */
  touch(): void {
    this.log.touch();
  }

  resetStats(): void {
    this.statsStore.reset();
  }

  private timeOut(): void {
    if (this.phase() === 'prompt' && !this.paused()) {
      this.timedOut.set(true);
      this.resolve(false);
    }
  }

  private record(card: C, correct: boolean, responseMs: number): void {
    this.statsStore.record(card.key, { correct, responseMs, at: Date.now() });
    this.log.recordAnswer(correct, responseMs);
  }
}
