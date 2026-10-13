import { DestroyRef, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { matchesArpeggio, matchesStrum, targetPitchClasses } from '../../core/audio/matchers';
import { PracticeLog } from '../../core/practice/practice-log';
import { pickNextCard } from '../../core/practice/scheduler';
import { SessionRecord } from '../../core/practice/session-log';
import { StatsStore } from '../../core/practice/stats-store';
import { loadJson, saveJson } from '../../core/practice/storage';
import { CHORD_QUALITIES } from './catalog';
import { TriadCard, buildDeck, chordTarget, settingsProblems, shapesFor } from './deck';
import { TriadSettings, sanitizeSettings } from './settings';

/** prompt: waiting for you to play; revealed: you looked; heard: the microphone recognised it. */
export type PracticePhase = 'prompt' | 'revealed' | 'heard';

/** Tags this module's sessions in the shared practice log. */
export const TRIADS_MODULE = 'triads';

const SETTINGS_KEY = 'triads:settings';
const STATS_KEY = 'triads:stats';

/** Pause on the answer after the microphone recognises a chord, before the next prompt. */
export const AUTO_ADVANCE_MS = 1500;

/** State of the triads module: settings, the deck, the current prompt and your stats. */
@Service({ autoProvided: false })
export class TriadsSession {
  private readonly mic = inject(MicListener);
  private readonly log = inject(PracticeLog);

  readonly settings = signal<TriadSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings(), this.deck()));

  private readonly statsStore = new StatsStore(STATS_KEY);
  readonly stats = this.statsStore.stats;

  readonly current = signal<TriadCard | null>(null);
  readonly phase = signal<PracticePhase>('prompt');
  /** Time from the prompt to the reveal or to the microphone match. */
  readonly responseMs = signal<number | null>(null);
  /** The session that just ended, for the summary; cleared when a new one starts. */
  readonly lastSession = signal<SessionRecord | null>(null);

  /** Shapes to show for a chord-only prompt, filtered by the chosen string sets and inversions. */
  readonly revealShapes = computed(() => {
    const card = this.current();
    return card && !card.shape ? shapesFor(card.quality, this.settings()) : [];
  });

  readonly selectedQualities = computed(() =>
    CHORD_QUALITIES.filter((quality) => this.settings().qualities.includes(quality.id)),
  );

  private readonly micMatched = computed(() => {
    const card = this.current();
    const { micMode, strumThreshold } = this.settings();
    if (!card || micMode === 'off' || this.phase() !== 'prompt' || this.log.paused()) {
      return false;
    }
    const target = chordTarget(card);
    if (micMode === 'arpeggio') {
      return matchesArpeggio(this.mic.heard(), target);
    }
    const chroma = this.mic.chroma();
    return chroma !== null && matchesStrum(chroma, targetPitchClasses(target), strumThreshold);
  });

  private shownAt = 0;
  private advanceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      if (this.micMatched()) {
        untracked(() => this.recordHeard());
      }
    });
    // Playing counts as practice even before you answer.
    effect(() => {
      if (this.mic.heard().length > 0) {
        untracked(() => this.log.touch());
      }
    });
    inject(DestroyRef).onDestroy(() => this.end());
  }

  updateSettings(changes: Partial<TriadSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Starts a timed session; returns false when the settings leave nothing to practise. */
  start(): boolean {
    this.end();
    this.lastSession.set(null);
    if (this.problems().length > 0) {
      return false;
    }
    const { micMode } = this.settings();
    if (micMode !== 'off') {
      void this.mic.start(micMode);
    }
    this.log.start(TRIADS_MODULE);
    this.showNext();
    return true;
  }

  /** Ends the session, if one is running, and keeps its summary in `lastSession`. */
  end(): void {
    clearTimeout(this.advanceTimer);
    this.mic.stop();
    if (this.current() && this.log.current()?.module === TRIADS_MODULE) {
      this.lastSession.set(this.log.end());
    }
    this.current.set(null);
  }

  reveal(): void {
    if (this.phase() === 'prompt') {
      this.log.touch();
      this.responseMs.set(Date.now() - this.shownAt);
      this.phase.set('revealed');
    }
  }

  /** Your own verdict after revealing the answer. */
  answer(correct: boolean): void {
    const card = this.current();
    if (!card || this.phase() !== 'revealed') {
      return;
    }
    this.statsStore.record(card.key, {
      correct,
      responseMs: this.responseMs() ?? 0,
      at: Date.now(),
    });
    this.log.recordAnswer(correct);
    this.showNext();
  }

  showNext(): void {
    clearTimeout(this.advanceTimer);
    const previous = this.current();
    this.current.set(pickNextCard(this.deck(), this.stats(), previous?.key ?? null));
    this.phase.set('prompt');
    this.responseMs.set(null);
    this.mic.clearHeard();
    this.shownAt = Date.now();
  }

  resetStats(): void {
    this.statsStore.reset();
  }

  private recordHeard(): void {
    const card = this.current();
    if (!card) {
      return;
    }
    const responseMs = Date.now() - this.shownAt;
    this.statsStore.record(card.key, { correct: true, responseMs, at: Date.now() });
    this.log.recordAnswer(true);
    this.responseMs.set(responseMs);
    this.phase.set('heard');
    this.advanceTimer = setTimeout(() => this.showNext(), AUTO_ADVANCE_MS);
  }
}
