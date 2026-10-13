import { Component, computed, inject } from '@angular/core';
import { Fretboard, FretboardDot } from '../../../core/fretboard/fretboard';
import { displayInterval } from '../../../core/music/intervals';
import { scaleFormula } from '../../../core/music/scales';
import { AnswerOption, CheckedAnswer, ChoiceButtons } from '../../../core/ui/answer/choice-buttons';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { notesOf, positionLabel } from '../deck';
import { ScalesSession } from '../scales-session';

/**
 * A scale in one hand position with its root marked: which scale is it? Once answered, the dots
 * show their intervals and the scale's formula appears, so a wrong answer still teaches.
 */
@Component({
  selector: 'app-scales-practice-page',
  imports: [PracticeFrame, Fretboard, ChoiceButtons],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(ScalesSession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;

  protected readonly answered = computed(() => this.run.phase() === 'answered');

  protected readonly heading = computed(() => {
    const card = this.card();
    return card ? positionLabel(card) : '';
  });

  protected readonly window = computed(() => {
    const start = this.card()?.start ?? 0;
    return { first: Math.max(1, start), last: start + 4 };
  });

  /** Root in amber, the other notes in teal; intervals appear once the card is answered. */
  protected readonly dots = computed((): FretboardDot[] => {
    const card = this.card();
    if (!card) {
      return [];
    }
    const answered = this.answered();
    return notesOf(card).map((note) => ({
      string: note.string,
      fret: note.fret,
      label: answered ? displayInterval(note.tone) : '',
      kind: note.tone === '1' ? 'root' : 'tone',
    }));
  });

  protected readonly formula = computed(() => {
    const card = this.card();
    return card ? `${card.scale.name}: ${scaleFormula(card.scale)}` : '';
  });

  protected readonly options = computed((): AnswerOption<string>[] =>
    this.session.choices().map((scale) => ({ value: scale.id, label: scale.name })),
  );

  protected readonly checked = computed((): CheckedAnswer<string> | null => {
    const card = this.card();
    const picked = this.session.picked();
    return card && picked !== null ? { picked, correct: card.scale.id } : null;
  });

  protected readonly description = computed(
    () => `Fretboard showing a scale in one position, ${this.heading()}. The root is in amber.`,
  );
}
