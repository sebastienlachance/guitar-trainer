import { Provider, Service, computed, effect, inject, signal, untracked } from '@angular/core';
import { MicListener } from '../../core/audio/mic-listener';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { capitalize, plural } from '../../core/ui/text';
import { CircleCard, answersCard, buildDeck, describeCard, settingsProblems } from './deck';
import { CIRCLE_NOTE_NAMES, CircleSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const CIRCLE_MODULE = 'circle';

const SETTINGS_KEY = 'circle:settings';
const STATS_KEY = 'circle:stats';

/**
 * The circle of fifths module: a note, and you name the next one round the circle, in fourths
 * (E♭ → A♭) or in fifths (E♭ → B♭). You tap a name or, with the microphone on, play the note
 * anywhere on the neck. The app checks the answer.
 */
@Service({ autoProvided: false })
export class CircleSession implements Drill {
  private readonly mic = inject(MicListener);

  readonly title = 'Circle of fifths';
  readonly unit = 'note';
  readonly selfCheck = false;

  readonly settings = signal<CircleSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));
  readonly micOn = computed(() => this.settings().micMode === 'play');

  readonly run = new PracticeRun<CircleCard>({
    module: CIRCLE_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onStart: () => {
      if (this.micOn()) {
        void this.mic.start('notes');
      }
    },
    onEnd: () => this.mic.stop(),
    onNext: () => {
      this.picked.set(null);
      this.mic.clearHeard();
    },
  });

  /** Your answer to the current card, once given. */
  readonly picked = signal<number | null>(null);

  /**
   * A wrong note played isn't counted, as the microphone can mishear, so only a wrong tap is a
   * miss. Without one, a 100% says nothing.
   */
  readonly waitsForRightAnswer = this.micOn;

  readonly describeCard = describeCard;

  readonly tags = computed(() => {
    const { directions, notes } = this.settings();
    return [
      capitalize(directions.join(' and ')),
      notes.length === CIRCLE_NOTE_NAMES.length ? 'All notes' : plural(notes.length, 'note'),
    ];
  });

  constructor() {
    effect(() => {
      const note = this.mic.heard().at(-1);
      if (note === undefined) {
        return;
      }
      untracked(() => {
        this.run.touch();
        const card = this.run.current();
        if (card && answersCard(card, note)) {
          this.answer(card.answer);
        }
      });
    });
  }

  updateSettings(changes: Partial<CircleSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Your answer: the pitch class you tapped or played. */
  answer(pitchClass: number): void {
    const card = this.run.current();
    if (!card || this.run.phase() !== 'prompt' || this.run.paused()) {
      return;
    }
    this.picked.set(pitchClass);
    this.run.resolve(pitchClass === card.answer);
  }
}

/** Providers for the circle pages: the session, also offered as the `Drill` the shared screens use. */
export function provideCircle(): Provider[] {
  return [CircleSession, { provide: Drill, useExisting: CircleSession }];
}
