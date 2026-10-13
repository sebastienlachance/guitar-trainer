import { DestroyRef, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { matchesArpeggio, matchesStrum, targetPitchClasses } from '../../core/audio/matchers';
import { pickNextCard } from '../../core/practice/scheduler';
import { StatsStore } from '../../core/practice/stats-store';
import { loadJson, saveJson } from '../../core/practice/storage';
import { CHORD_QUALITIES } from './catalog';
import { TriadCard, buildDeck, chordTarget, settingsProblems, shapesFor } from './deck';
import { TriadSettings, sanitizeSettings } from './settings';

/** prompt: waiting for you to play; revealed: you looked; heard: the microphone recognised it. */
export type PracticePhase = 'prompt' | 'revealed' | 'heard';

const SETTINGS_KEY = 'triads:settings';
const STATS_KEY = 'triads:stats';

/** Pause on the answer after the microphone recognises a chord, before the next prompt. */
export const AUTO_ADVANCE_MS = 1500;

/** State of the triads module: settings, the deck, the current prompt and your stats. */
@Service({ autoProvided: false })
export class TriadsSession {
  private readonly mic = inject(MicListener);

  readonly settings = signal<TriadSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings(), this.deck()));

  private readonly statsStore = new StatsStore(STATS_KEY);
  readonly stats = this.statsStore.stats;

  readonly current = signal<TriadCard | null>(null);
  readonly phase = signal<PracticePhase>('prompt');
  /** Time from the prompt to the reveal or to the microphone match. */
  readonly responseMs = signal<number | null>(null);

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
    if (!card || micMode === 'off' || this.phase() !== 'prompt') {
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
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  updateSettings(changes: Partial<TriadSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Starts a practice run; returns false when the settings leave nothing to practise. */
  start(): boolean {
    this.stop();
    if (this.problems().length > 0) {
      return false;
    }
    const { micMode } = this.settings();
    if (micMode !== 'off') {
      void this.mic.start(micMode);
    }
    this.showNext();
    return true;
  }

  stop(): void {
    clearTimeout(this.advanceTimer);
    this.mic.stop();
    this.current.set(null);
  }

  reveal(): void {
    if (this.phase() === 'prompt') {
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
    this.responseMs.set(responseMs);
    this.phase.set('heard');
    this.advanceTimer = setTimeout(() => this.showNext(), AUTO_ADVANCE_MS);
  }
}
