import { Provider, Service, computed, signal } from '@angular/core';
import { STRING_NUMBERS } from '../../core/fretboard/tuning';
import { NATURAL_NOTE_NAMES } from '../../core/music/notes';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { plural } from '../../core/ui/text';
import { IdentifyCard, answerChoices, buildDeck, settingsProblems } from './deck';
import { IdentifySettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const IDENTIFY_MODULE = 'identify';

const SETTINGS_KEY = 'identify:settings';
const STATS_KEY = 'identify:stats';

/**
 * The identify notes module: a dot on the fretboard, and you pick its name from a few options or
 * from all twelve. The app checks the answer.
 */
@Service({ autoProvided: false })
export class IdentifySession implements Drill {
  readonly title = 'Identify notes';
  readonly unit = 'note';
  readonly selfCheck = false;

  readonly settings = signal<IdentifySettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings(), this.deck()));

  readonly run = new PracticeRun<IdentifyCard>({
    module: IDENTIFY_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onNext: () => {
      const card = this.run.current();
      this.picked.set(null);
      this.choices.set(card ? answerChoices(card.pitchClass, this.settings().choices) : []);
    },
  });

  /** Pitch classes offered for the current card, in order from C. */
  readonly choices = signal<readonly number[]>([]);
  /** Your answer to the current card, once given. */
  readonly picked = signal<number | null>(null);

  readonly tags = computed(() => {
    const { notes, strings, maxFret, choices } = this.settings();
    const naturalsOnly =
      notes.length === NATURAL_NOTE_NAMES.length &&
      notes.every((name) => NATURAL_NOTE_NAMES.includes(name));
    return [
      notes.length === 12 ? 'All notes' : naturalsOnly ? 'Naturals' : plural(notes.length, 'note'),
      strings.length === STRING_NUMBERS.length ? 'All strings' : `Strings ${strings.join(', ')}`,
      `Frets 0–${maxFret}`,
      choices === 12 ? 'All 12 names' : '4 choices',
    ];
  });

  updateSettings(changes: Partial<IdentifySettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Your answer: the pitch class you picked. */
  answer(pitchClass: number): void {
    const card = this.run.current();
    if (!card || this.run.phase() !== 'prompt' || this.run.paused()) {
      return;
    }
    this.picked.set(pitchClass);
    this.run.resolve(pitchClass === card.pitchClass);
  }
}

/** Providers for the identify pages: the session, also offered as the `Drill` the shared screens use. */
export function provideIdentify(): Provider[] {
  return [IdentifySession, { provide: Drill, useExisting: IdentifySession }];
}
