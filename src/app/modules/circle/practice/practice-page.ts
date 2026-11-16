import { Component, computed, inject } from '@angular/core';
import { circleNoteLabel } from '../../../core/music/circle';
import { AnswerOption, CheckedAnswer, ChoiceButtons } from '../../../core/ui/answer/choice-buttons';
import { CircleDiagram } from '../../../core/ui/circle-diagram';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { CircleSession } from '../circle-session';
import { ANSWER_CHOICES, directionLabel } from '../deck';

/**
 * "What comes after E♭, in fourths?" You tap a name, or play the note with the microphone on, and
 * the app checks it. Once answered, a circle shows the step.
 */
@Component({
  selector: 'app-circle-practice-page',
  imports: [PracticeFrame, ChoiceButtons, CircleDiagram, MicStatus],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(CircleSession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;

  protected readonly fromLabel = computed(() => {
    const card = this.card();
    return card ? circleNoteLabel(card.from) : '';
  });

  protected readonly direction = computed(() => {
    const card = this.card();
    return card ? directionLabel(card.direction) : '';
  });

  protected readonly options: AnswerOption<number>[] = ANSWER_CHOICES.map((pitchClass) => ({
    value: pitchClass,
    label: circleNoteLabel(pitchClass),
  }));

  protected readonly checked = computed((): CheckedAnswer<number> | null => {
    const card = this.card();
    const picked = this.session.picked();
    return card && picked !== null ? { picked, correct: card.answer } : null;
  });

  protected readonly wrongPick = computed(() => {
    const checked = this.checked();
    return checked && checked.picked !== checked.correct ? checked.picked : null;
  });
}
