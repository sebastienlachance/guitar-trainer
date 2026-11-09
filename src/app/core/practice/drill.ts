import { Signal } from '@angular/core';
import { PracticeCard, PracticeRun } from './practice-run';

/** A card in words, from its stats key. */
export interface CardDescription {
  readonly title: string;
  readonly detail: string;
}

/** How a module groups its answers (triads: by string set), for the summary and the stats. */
export interface AnswerGroups {
  /** What one group is called: "string set" gives "By string set" and "3 string sets". */
  readonly name: string;
  /** Column heading for a group's key, "Strings"; in lower case before it: "on strings 2-3-4". */
  readonly heading: string;
  /** Every group's key, in the order to list them. */
  readonly keys: readonly string[];
}

/**
 * What a practice module gives the shared screens (top bar, practice frame, setup and stats
 * blocks). A module's service implements this and is provided under this token in its routes:
 * `[MySession, { provide: Drill, useExisting: MySession }]`.
 * See docs/adding-a-practice-module.md.
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
  /**
   * True when the prompt shows the outcome of an answer itself, such as a count of chord changes:
   * the practice frame then leaves out its "Correct" / "Not quite" line.
   */
  readonly ownResult?: boolean;
  /** Set when the run's `groupOf` option sorts answers into groups. */
  readonly answerGroups?: AnswerGroups;
  /** Names a card for the summary's slowest cards; without it, the summary leaves them out. */
  readonly describeCard?: (key: string) => CardDescription | undefined;
  /**
   * True when the app waits for the right answer rather than marking a wrong one, as triads does
   * with the microphone and no time limit. A 100% then says nothing, so the summary leaves
   * "Correct" out unless something was missed.
   */
  readonly waitsForRightAnswer?: Signal<boolean>;
}
