import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import {
  OpenSession,
  SessionRecord,
  closeSession,
  elapsedMs,
  isIdle,
  isOpenSession,
  isSessionRecords,
  pauseTimer,
  resumeTimer,
  startTimer,
  touchTimer,
} from './session-log';
import { loadJson, saveJson } from './storage';

const HISTORY_KEY = 'sessions';
/** Snapshot of the open session, so closing the tab mid-session doesn't lose it. */
const OPEN_SESSION_KEY = 'sessions:open';

/** Timed practice sessions for every module: the one in progress and the history. */
@Service()
export class PracticeLog {
  private readonly open = signal<OpenSession | null>(null);
  private readonly records = signal<readonly SessionRecord[]>([]);
  /** Updated every second while a session is open, to drive the live clock. */
  private readonly now = signal(Date.now());
  private ticker: ReturnType<typeof setInterval> | undefined;
  /** The open session's time spent paused before the current pause, if any. */
  private pausedBeforeMs = 0;
  private pausedSince: number | null = null;

  readonly current = this.open.asReadonly();
  /** Finished sessions, newest first. */
  readonly history = this.records.asReadonly();

  readonly activeMs = computed(() => {
    const session = this.open();
    return session ? elapsedMs(session.timer, this.now()) : 0;
  });
  readonly idle = computed(() => {
    const session = this.open();
    return session !== null && isIdle(session.timer, this.now());
  });
  readonly paused = computed(() => this.open()?.timer.paused ?? false);

  constructor() {
    const saved = loadJson(HISTORY_KEY);
    this.records.set(isSessionRecords(saved) ? saved : []);
    this.recoverUnfinished();
    inject(DestroyRef).onDestroy(() => clearInterval(this.ticker));
  }

  /**
   * Opens a session. `timed` is false for a module whose answers take a set time, such as a
   * take: the session then keeps no response times.
   */
  start(module: string, timed = true): void {
    this.end();
    const now = this.tick();
    this.open.set({
      module,
      startedAt: now,
      timer: startTimer(now),
      answered: 0,
      correct: 0,
      ...(timed ? { totalResponseMs: 0 } : {}),
    });
    this.pausedBeforeMs = 0;
    this.pausedSince = null;
    this.saveSnapshot();
    this.ticker = setInterval(() => this.tick(), 1000);
  }

  /** Something happened that shows you're practising, such as a reveal or a played note. */
  touch(): void {
    const now = this.tick();
    this.updateOpen((session) => ({ ...session, timer: touchTimer(session.timer, now) }));
  }

  /** An answer, with its response time, or null in a session that keeps none. Ends a pause. */
  recordAnswer(correct: boolean, responseMs: number | null): void {
    const now = this.tick();
    this.updateOpen((session) => ({
      ...session,
      timer: touchTimer(resumeTimer(session.timer, now), now),
      answered: session.answered + 1,
      correct: session.correct + (correct ? 1 : 0),
      totalResponseMs:
        responseMs === null ? session.totalResponseMs : (session.totalResponseMs ?? 0) + responseMs,
    }));
    this.endPause(now);
    this.saveSnapshot();
  }

  pause(): void {
    const now = this.tick();
    if (this.open() && !this.paused()) {
      this.pausedSince = now;
    }
    this.updateOpen((session) => ({ ...session, timer: pauseTimer(session.timer, now) }));
    this.saveSnapshot();
  }

  resume(): void {
    const now = this.tick();
    this.updateOpen((session) => ({ ...session, timer: resumeTimer(session.timer, now) }));
    this.endPause(now);
    this.saveSnapshot();
  }

  /** The open session's time spent paused up to `now`, which answer times leave out. */
  pausedMsUntil(now: number): number {
    return this.pausedBeforeMs + (this.pausedSince === null ? 0 : now - this.pausedSince);
  }

  /**
   * Closes the open session and returns it. It joins the history only if at least one chord was
   * answered; an empty session isn't worth a line.
   */
  end(): SessionRecord | null {
    const session = this.open();
    if (!session) {
      return null;
    }
    clearInterval(this.ticker);
    const record = closeSession(session, this.tick());
    this.open.set(null);
    saveJson(OPEN_SESSION_KEY, null);
    this.keep(record);
    return record;
  }

  private keep(record: SessionRecord): void {
    if (record.answered > 0) {
      this.records.update((records) => [record, ...records]);
      saveJson(HISTORY_KEY, this.records());
    }
  }

  /** Files a session left open when the app was closed, ending it at its last recorded activity. */
  private recoverUnfinished(): void {
    const snapshot = loadJson(OPEN_SESSION_KEY);
    if (isOpenSession(snapshot)) {
      this.keep(closeSession(snapshot, snapshot.timer.lastActivity));
      saveJson(OPEN_SESSION_KEY, null);
    }
  }

  private endPause(now: number): void {
    if (this.pausedSince !== null) {
      this.pausedBeforeMs += now - this.pausedSince;
      this.pausedSince = null;
    }
  }

  private updateOpen(change: (session: OpenSession) => OpenSession): void {
    this.open.update((session) => (session ? change(session) : session));
  }

  private saveSnapshot(): void {
    saveJson(OPEN_SESSION_KEY, this.open());
  }

  private tick(): number {
    const now = Date.now();
    this.now.set(now);
    return now;
  }
}
