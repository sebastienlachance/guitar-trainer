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

  start(module: string): void {
    this.end();
    const now = this.tick();
    this.open.set({ module, startedAt: now, timer: startTimer(now), answered: 0, correct: 0 });
    this.saveSnapshot();
    this.ticker = setInterval(() => this.tick(), 1000);
  }

  /** Something happened that shows you're practising, such as a reveal or a played note. */
  touch(): void {
    const now = this.tick();
    this.updateOpen((session) => ({ ...session, timer: touchTimer(session.timer, now) }));
  }

  recordAnswer(correct: boolean): void {
    const now = this.tick();
    this.updateOpen((session) => ({
      ...session,
      timer: touchTimer(resumeTimer(session.timer, now), now),
      answered: session.answered + 1,
      correct: session.correct + (correct ? 1 : 0),
    }));
    this.saveSnapshot();
  }

  pause(): void {
    const now = this.tick();
    this.updateOpen((session) => ({ ...session, timer: pauseTimer(session.timer, now) }));
    this.saveSnapshot();
  }

  resume(): void {
    const now = this.tick();
    this.updateOpen((session) => ({ ...session, timer: resumeTimer(session.timer, now) }));
    this.saveSnapshot();
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
