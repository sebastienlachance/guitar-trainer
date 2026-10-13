import { Provider, Service, computed, signal } from '@angular/core';
import { SCALE_TYPES } from '../../core/music/scales';
import { Drill } from '../../core/practice/drill';
import { PracticeRun } from '../../core/practice/practice-run';
import { loadJson, saveJson } from '../../core/practice/storage';
import { plural } from '../../core/ui/text';
import { ScaleCard, buildDeck, settingsProblems } from './deck';
import { ScalesSettings, sanitizeSettings } from './settings';

/** Tags this module's sessions in the shared practice log. */
export const SCALES_MODULE = 'scales';

const SETTINGS_KEY = 'scales:settings';
const STATS_KEY = 'scales:stats';

/**
 * The identify scales module: a scale in one hand position, its root marked, and you pick which
 * scale it is from the ones you chose. The app checks the answer.
 */
@Service({ autoProvided: false })
export class ScalesSession implements Drill {
  readonly title = 'Identify scales';
  readonly unit = 'scale';
  readonly selfCheck = false;

  readonly settings = signal<ScalesSettings>(sanitizeSettings(loadJson(SETTINGS_KEY)));
  readonly deck = computed(() => buildDeck(this.settings()));
  readonly problems = computed(() => settingsProblems(this.settings()));

  readonly run = new PracticeRun<ScaleCard>({
    module: SCALES_MODULE,
    statsKey: STATS_KEY,
    deck: this.deck,
    problems: this.problems,
    onNext: () => this.picked.set(null),
  });

  /** The scales to choose between, in catalog order. */
  readonly choices = computed(() =>
    SCALE_TYPES.filter((scale) => this.settings().scales.includes(scale.id)),
  );

  /** Your answer to the current card (a scale id), once given. */
  readonly picked = signal<string | null>(null);

  readonly tags = computed(() => [
    plural(this.settings().scales.length, 'scale'),
    `Frets 0–${this.settings().maxFret}`,
  ]);

  updateSettings(changes: Partial<ScalesSettings>): void {
    this.settings.update((settings) => ({ ...settings, ...changes }));
    saveJson(SETTINGS_KEY, this.settings());
  }

  /** Your answer: the id of the scale you picked. */
  answer(scaleId: string): void {
    const card = this.run.current();
    if (!card || this.run.phase() !== 'prompt' || this.run.paused()) {
      return;
    }
    this.picked.set(scaleId);
    this.run.resolve(scaleId === card.scale.id);
  }
}

/** Providers for the scales pages: the session, also offered as the `Drill` the shared screens use. */
export function provideScales(): Provider[] {
  return [ScalesSession, { provide: Drill, useExisting: ScalesSession }];
}
