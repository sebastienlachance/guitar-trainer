import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { FretPosition } from '../../core/fretboard/fretboard';
import { IntervalName } from '../../core/music/intervals';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { plural } from '../../core/ui/text';
import {
  IntervalCard,
  IntervalQuestion,
  askedIntervals,
  buildDeck,
  findTargets,
  questionFor,
  settingsProblems,
} from './deck';
import { IntervalsSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const INTERVALS_MODULE = 'intervals';

const SETTINGS_KEY = 'intervals:settings';
const STATS_KEY = 'intervals:stats';

/**
 * The intervals in a scale module: a scale shape around its root, and you find an interval on
 * the neck (by tapping it or playing it) or name the interval of a marked note. The app checks
 * the answer.
 */
@Service({ autoProvided: false })
export class IntervalsSession implements Drill {
  private readonly mic = inject(MicListener);

  readonly title = 'Intervals in a scale';
  readonly unit = 'interval';
  readonly selfCheck = false;

  readonly settings = signal<IntervalsSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));

  /** The microphone answers Find questions when it's on. */
  readonly micListens = computed(
    () => this.settings().micMode === 'play' && this.settings().tasks.includes('find'),
  );

  readonly run = new PracticeRun<IntervalCard>({
    module: INTERVALS_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onStart: () => {
      if (this.micListens()) {
        void this.mic.start('notes');
      }
    },
    onEnd: () => this.mic.stop(),
    onNext: () => {
      const card = this.run.current();
      this.question.set(card ? questionFor(card, this.settings().maxFret, Math.random) : null);
      this.tapped.set(null);
      this.picked.set(null);
      this.mic.clearHeard();
    },
  });

  /** Where the current card is asked: a new root each time a card comes up. */
  readonly question = signal<IntervalQuestion | null>(null);

  /** Your answer to a Find question: where you tapped, or the place you played. */
  readonly tapped = signal<FretPosition | null>(null);

  /** Your answer to a Name question. */
  readonly picked = signal<IntervalName | null>(null);

  /** Every place that answers the current Find question. */
  readonly targets = computed(() => {
    const card = this.run.current();
    const question = this.question();
    return card && question ? findTargets(card, question) : [];
  });

  /** The intervals to choose from in a Name question: the scale's, without the root. */
  readonly choices = computed(() => {
    const card = this.run.current();
    return card ? askedIntervals(card.scale) : [];
  });

  readonly tags = computed(() => {
    const { tasks, scales, rootStrings, neck } = this.settings();
    return [
      tasks.length === 2 ? 'Find and name' : tasks[0] === 'find' ? 'Find' : 'Name',
      plural(scales.length, 'scale'),
      `Root on ${rootStrings.join(' and ')}`,
      neck === 'shape' ? 'Scale shape' : 'Roots only',
    ];
  });

  constructor() {
    // A played note answers a Find question when its exact pitch is one of the places asked for.
    // The microphone can't tell strings apart, so the same pitch on another string counts.
    effect(() => {
      const note = this.mic.heard().at(-1);
      if (note === undefined) {
        return;
      }
      untracked(() => {
        this.run.touch();
        const target = this.targets().find((place) => place.midi === note);
        if (target) {
          this.pick(target);
        }
      });
    });
  }

  updateSettings(changes: Partial<IntervalsSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** An answer to a Find question: any place holding the interval counts. */
  pick(position: FretPosition): void {
    if (!this.awaits('find')) {
      return;
    }
    this.tapped.set({ string: position.string, fret: position.fret });
    this.run.resolve(
      this.targets().some(
        (target) => target.string === position.string && target.fret === position.fret,
      ),
    );
  }

  /** An answer to a Name question. */
  answer(interval: IntervalName): void {
    if (!this.awaits('name')) {
      return;
    }
    this.picked.set(interval);
    this.run.resolve(interval === this.run.current()?.interval);
  }

  /** Whether the current card is a question of this kind still waiting for its answer. */
  private awaits(task: IntervalCard['task']): boolean {
    return this.run.current()?.task === task && this.run.phase() === 'prompt' && !this.run.paused();
  }
}

/** Providers for the intervals pages: the session, also offered as the `Drill` the shared screens use. */
export function provideIntervals(): Provider[] {
  return [IntervalsSession, { provide: Drill, useExisting: IntervalsSession }];
}
