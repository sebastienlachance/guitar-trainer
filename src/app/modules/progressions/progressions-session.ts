import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { matchesStrum } from '../../core/audio/matchers';
import { Metronome, clickSchedule } from '../../core/audio/metronome';
import { MicListener, hasStopped } from '../../core/audio/mic-listener';
import { RhythmListener } from '../../core/audio/rhythm-listener';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { Take } from '../../core/practice/take';
import { Levels, isLevels, levelOf, nextLevel } from '../../core/practice/tempo-ladder';
import { plural } from '../../core/ui/text';
import {
  ProgressionCard,
  Slot,
  SlotOutcome,
  TAKES_KEPT,
  TakeRecord,
  buildDeck,
  isTakes,
  settingsProblems,
  slotAt,
  slotOutcome,
  takePasses,
  takeSlots,
} from './deck';
import { ProgressionsSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const PROGRESSIONS_MODULE = 'progressions';

const SETTINGS_KEY = 'progressions:settings';
const STATS_KEY = 'progressions:stats';
const LEVELS_KEY = 'progressions:levels';
const TAKES_KEY = 'progressions:takes';

/** Beats of count-in: one bar. */
export const COUNT_IN_BEATS = 4;
/** Time between pressing Play and the first click, for the audio to be scheduled. */
const LEAD_IN_S = 0.3;
/**
 * Which chord a strike sounds like is read at these times after it, and any read that matches
 * lands the chord. The spectrum takes a moment to let go of the chord before (its window is a
 * third of a second long): the first read may still hear some of it, the last one hardly any.
 */
export const CHORD_CHECKS_MS: readonly number[] = [150, 250, 350];
/** How close a strum must sound to the chord: the triads module's default strictness. */
const STRUM_THRESHOLD = 0.8;

export interface TakeResult {
  readonly outcomes: readonly SlotOutcome[];
  readonly passed: boolean;
  readonly bpm: number;
  readonly nextBpm: number;
}

/**
 * Progressions in time: play a chord progression with the metronome, each chord landing on its
 * first beat. Strikes are timed by the rhythm listener, on the metronome's own clock and deaf to
 * its tick; the note listener's spectrum says which chord each one sounds like.
 */
@Service({ autoProvided: false })
export class ProgressionsSession implements Drill {
  private readonly listener = inject(RhythmListener);
  private readonly mic = inject(MicListener);
  private readonly metronome = inject(Metronome);

  readonly title = 'Progressions';
  readonly unit = 'take';
  readonly selfCheck = false;
  readonly ownResult = true;

  readonly settings = signal<ProgressionsSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.deck()));

  readonly levels = signal<Levels>(loadLevels());
  readonly takes = signal<readonly TakeRecord[]>(loadTakes());

  readonly run = new PracticeRun<ProgressionCard>({
    module: PROGRESSIONS_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    // The take's chords are worth a look: wait for Next even after a pass.
    advanceAfterCorrect: false,
    // A take lasts as long as its chords, whatever you play.
    timesAnswers: false,
    onStart: () => {
      void this.listener.start();
      void this.mic.start('spectrum');
    },
    onEnd: () => {
      this.take.stop();
      this.listener.stop();
      this.mic.stop();
    },
    onNext: () => {
      this.result.set(null);
      this.slots.set([]);
      this.hits.set([]);
    },
  });

  /** count-in: a bar of clicks to listen to; playing: the take itself. */
  private readonly take = new Take<'count-in' | 'playing'>({
    run: this.run,
    inputLost: computed(() => hasStopped(this.listener.status()) || hasStopped(this.mic.status())),
    onStop: () => this.metronome.stop(),
  });
  readonly stage = this.take.stage.asReadonly();
  /** The chords of the take in progress, or of the last one. */
  readonly slots = signal<readonly Slot[]>([]);
  /** For each chord of the take, the strike that landed it; null until one does. */
  readonly hits = signal<readonly (number | null)[]>([]);
  readonly result = signal<TakeResult | null>(null);

  /** The current card's tempo, where its ladder stands. */
  readonly tempo = computed(() => {
    const card = this.run.current();
    return card ? levelOf(this.levels(), card.key, this.settings().startTempo).bpm : 0;
  });

  /** The chord being played now, by the metronome's count; -1 outside the take. */
  readonly currentSlot = computed(() => {
    const beat = this.metronome.beat();
    if (!beat || this.stage() !== 'playing') {
      return -1;
    }
    return Math.floor((beat.index - COUNT_IN_BEATS) / this.settings().beatsPerChord);
  });

  readonly tags = computed(() => {
    const { beatsPerChord, click } = this.settings();
    return [
      beatsPerChord === 4 ? 'A bar a chord' : `${plural(beatsPerChord, 'beat')} a chord`,
      click === 'sound' ? 'Tick and light' : 'Light only',
    ];
  });

  private beat = 0.5;
  private strikesSeen = 0;

  constructor() {
    effect(() => {
      const strikes = this.listener.strikes();
      untracked(() => this.check(strikes));
    });
  }

  updateSettings(changes: Partial<ProgressionsSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Plays a take of the current card: a bar of count-in, then the progression twice through. */
  async play(): Promise<void> {
    const card = this.run.current();
    if (!card) {
      return;
    }
    const context = await this.take.prepare(async () => {
      await this.listener.start();
      return hasStopped(this.mic.status()) ? null : this.listener.context;
    });
    if (!context) {
      return;
    }
    this.listener.clearStrikes();
    this.strikesSeen = 0;
    const bpm = this.tempo();
    const beatsPerChord = this.settings().beatsPerChord;
    this.beat = 60 / bpm;
    const start = this.listener.now() + LEAD_IN_S;
    const takeStart = start + COUNT_IN_BEATS * this.beat;
    const slots = takeSlots(card, takeStart, this.beat, beatsPerChord);
    const beats = COUNT_IN_BEATS + slots.length * beatsPerChord;
    const clicks = clickSchedule(start, bpm, 1, Math.ceil(beats / 4)).slice(0, beats);
    this.slots.set(slots);
    this.hits.set(slots.map(() => null));
    this.result.set(null);
    this.metronome.play(context, clicks, this.settings().click === 'sound');
    this.take.stage.set('count-in');
    this.run.touch();
    this.at(takeStart, () => this.take.stage.set('playing'));
    const end = slots[slots.length - 1].time + beatsPerChord * this.beat;
    this.at(end + 0.3, () => this.finish(card, bpm));
  }

  /** New strikes: each one that sounds like the chord it's meant for lands that chord. */
  private check(strikes: readonly number[]): void {
    const fresh = strikes.slice(this.strikesSeen);
    this.strikesSeen = strikes.length;
    const stage = this.stage();
    if (stage !== 'count-in' && stage !== 'playing') {
      return;
    }
    for (const strike of fresh) {
      const index = slotAt(this.slots(), strike, this.beat, this.settings().beatsPerChord);
      if (index < 0 || this.hits()[index] !== null) {
        continue;
      }
      this.run.touch();
      for (const ms of CHORD_CHECKS_MS) {
        this.take.after(ms, () => this.land(index, strike));
      }
    }
  }

  /** Lands a chord with a strike, if the chord sounding now is the one it's meant for. */
  private land(index: number, strike: number): void {
    const chroma = this.mic.chroma();
    const chord = this.slots()[index]?.chord;
    if (
      chord &&
      this.hits()[index] === null &&
      chroma !== null &&
      matchesStrum(chroma, chord.pitchClasses, STRUM_THRESHOLD)
    ) {
      this.hits.update((hits) => hits.map((hit, at) => (at === index ? strike : hit)));
    }
  }

  private finish(card: ProgressionCard, bpm: number): void {
    this.take.stop();
    const outcomes = this.slots().map((slot, index) =>
      slotOutcome(slot, this.hits()[index], this.beat),
    );
    const passed = takePasses(outcomes);
    const level = levelOf(this.levels(), card.key, this.settings().startTempo);
    const next = nextLevel(level, passed);
    this.levels.update((levels) => ({ ...levels, [card.key]: next }));
    saveJson(LEVELS_KEY, this.levels());
    const take: TakeRecord = {
      progression: card.key,
      bpm,
      at: Date.now(),
      onTime: outcomes.filter((outcome) => outcome === 'on-time').length,
      total: outcomes.length,
      passed,
    };
    this.takes.update((takes) => [...takes, take].slice(-TAKES_KEPT));
    saveJson(TAKES_KEY, this.takes());
    this.result.set({ outcomes, passed, bpm, nextBpm: next.bpm });
    this.run.resolve(passed);
  }

  /** Runs an action at a time on the audio clock, unless the take stops first. */
  private at(time: number, action: () => void): void {
    this.take.after((time - this.listener.now()) * 1000, action);
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

/** Providers for the pages: the session, also offered as the `Drill` the shared screens use. */
export function provideProgressions(): Provider[] {
  return [ProgressionsSession, { provide: Drill, useExisting: ProgressionsSession }];
}
