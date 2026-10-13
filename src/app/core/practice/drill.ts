import { Signal } from '@angular/core';
import { PracticeCard, PracticeRun } from './practice-run';

/**
 * What a practice module gives the shared screens (top bar, practice frame, session history).
 * A module provides its service under this token in its routes.
 */
export abstract class Drill {
  /** Module name for the top bar, e.g. "Triads". */
  abstract readonly title: string;
  /** What one answer is called in counts: "chord" gives "3 chords". */
  abstract readonly unit: string;
  abstract readonly run: PracticeRun<PracticeCard>;
  /** Short reminders of what is being practised, shown above the prompt. */
  abstract readonly tags: Signal<readonly string[]>;
  /** True when you reveal the answer and judge yourself; false when the app checks your answer. */
  abstract readonly selfCheck: boolean;
}
