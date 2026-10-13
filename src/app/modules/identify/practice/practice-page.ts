import { Component, computed, inject } from '@angular/core';
import { Fretboard, FretboardDot } from '../../../core/fretboard/fretboard';
import { stringLabel } from '../../../core/fretboard/tuning';
import { commonNoteName, pitchClassNames } from '../../../core/music/notes';
import { AnswerOption, CheckedAnswer, ChoiceButtons } from '../../../core/ui/answer/choice-buttons';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { capitalize } from '../../../core/ui/text';
import { IdentifySession } from '../identify-session';

/**
 * A dot on the fretboard: which note is it? You pick a name and the app checks it. There's no
 * answer template: the buttons and the dot show the result, and the frame adds Next.
 */
@Component({
  selector: 'app-identify-practice-page',
  imports: [PracticeFrame, Fretboard, ChoiceButtons],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(IdentifySession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;

  /** Where the dot is, in words: "string 5 (A), fret 7". */
  protected readonly where = computed(() => {
    const card = this.card();
    if (!card) {
      return '';
    }
    return `${stringLabel(card.string)}, ${card.fret === 0 ? 'open' : `fret ${card.fret}`}`;
  });

  protected readonly heading = computed(() => capitalize(this.where()));

  protected readonly window = computed(() => ({ first: 1, last: this.session.settings().maxFret }));

  /** The asked position: a question mark until answered, then the note's name. */
  protected readonly dots = computed((): FretboardDot[] => {
    const card = this.card();
    if (!card) {
      return [];
    }
    const answered = this.run.phase() === 'answered';
    const label = answered ? commonNoteName(card.pitchClass) : '?';
    return [{ string: card.string, fret: card.fret, label, kind: 'root' }];
  });

  protected readonly options = computed((): AnswerOption<number>[] =>
    this.session.choices().map((pitchClass) => ({
      value: pitchClass,
      label: pitchClassNames(pitchClass),
    })),
  );

  protected readonly checked = computed((): CheckedAnswer<number> | null => {
    const card = this.card();
    const picked = this.session.picked();
    return card && picked !== null ? { picked, correct: card.pitchClass } : null;
  });

  protected readonly description = computed(
    () => `Fretboard with one dot, on ${this.where()}. Which note is it?`,
  );
}
