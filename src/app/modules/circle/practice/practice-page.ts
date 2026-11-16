import { Component, computed, inject } from '@angular/core';
import { Fretboard, FretboardDot, fretWindowFor } from '../../../core/fretboard/fretboard';
import { pitchClassAt } from '../../../core/fretboard/placement';
import { stringLabel } from '../../../core/fretboard/tuning';
import { circleNoteLabel, keySignature, majorKeyWith } from '../../../core/music/circle';
import { AnswerOption, CheckedAnswer, ChoiceButtons } from '../../../core/ui/answer/choice-buttons';
import { CircleDiagram } from '../../../core/ui/circle-diagram';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { CircleSession } from '../circle-session';
import { answerKind, answerOptions, isStepCard, nextSpot, promptOf, shapeHint } from '../deck';
import { LAP_LENGTH, lapDone, lapResultText } from '../laps';

const OPTION_GROUP_LABELS = {
  note: 'Note names',
  minor: 'Minor keys',
  signature: 'Key signatures',
} as const;

/** The step the circle shows once answered: an arrow, and a wrong answer marked. */
interface DiagramStep {
  readonly from: number;
  readonly to: number;
  readonly clockwise: boolean | null;
  readonly wrong: number | null;
}

/**
 * One question of the circle: name the next note, answer a question about a key, or find the
 * next note on the neck. You tap (or play) the answer and the app checks it. Once answered, a
 * circle shows the step, or the neck shows the shape.
 */
@Component({
  selector: 'app-circle-practice-page',
  imports: [PracticeFrame, ChoiceButtons, CircleDiagram, Fretboard, MicStatus],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(CircleSession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;
  private readonly answered = computed(() => this.run.phase() === 'answered');

  protected readonly prompt = computed(() => {
    const card = this.card();
    return card ? promptOf(card) : null;
  });

  private readonly answerKind = computed(() => {
    const card = this.card();
    return card ? answerKind(card) : 'note';
  });

  protected readonly optionsLabel = computed(() => OPTION_GROUP_LABELS[this.answerKind()]);

  protected readonly options = computed((): AnswerOption<number>[] =>
    answerOptions(this.answerKind()),
  );

  protected readonly checked = computed((): CheckedAnswer<number> | null => {
    const card = this.card();
    const picked = this.session.picked();
    return card && picked !== null ? { picked, correct: card.answer } : null;
  });

  protected readonly micHint = computed(() =>
    this.answerKind() === 'signature' ? 'tap the signature' : 'play it anywhere on the neck',
  );

  /**
   * A step round the circle shows as itself. A key shows how far round from C it sits, clockwise
   * for sharps: that count is its signature. A relative minor isn't on this circle.
   */
  protected readonly diagram = computed((): DiagramStep | null => {
    const card = this.card();
    if (!card || !this.answered() || card.kind === 'neck' || card.kind === 'relative') {
      return null;
    }
    const picked = this.session.picked();
    if (isStepCard(card)) {
      const wrong = picked !== null && picked !== card.answer ? picked : null;
      return { from: card.from, to: card.answer, clockwise: card.direction === 'fifths', wrong };
    }
    const signature = keySignature(card.major);
    const pickedKey = picked === null || card.kind === 'key' ? picked : majorKeyWith(picked);
    return {
      from: 0,
      to: card.major,
      clockwise: signature === 0 ? null : signature > 0,
      wrong: pickedKey !== null && pickedKey !== card.major ? pickedKey : null,
    };
  });

  /** In laps: how far round this lap is, or how the lap went once done. */
  protected readonly lapLine = computed(() => {
    const lap = this.session.lap();
    const last = this.session.lastLap();
    if (!this.session.lapsOn() || !lap) {
      return '';
    }
    if (lapDone(lap) && last) {
      return lapResultText(last, this.session.laps().slice(0, -1));
    }
    const position = lap.answered + (this.answered() ? 0 : 1);
    return `Note ${position} of ${LAP_LENGTH} in this lap`;
  });

  /** On the neck, once answered: the shape of the step. */
  protected readonly shapeHint = computed(() => {
    const card = this.card();
    const spot = this.session.spot();
    return card?.kind === 'neck' && spot && this.answered() ? shapeHint(card.direction, spot) : '';
  });

  /** A few frets around the note and the next one, so the board fits a phone without scrolling. */
  protected readonly window = computed(() => {
    const card = this.card();
    const spot = this.session.spot();
    if (card?.kind !== 'neck' || !spot) {
      return undefined;
    }
    return fretWindowFor([spot.fret, nextSpot(card.direction, spot).fret]);
  });

  /** The keyboard cursor starts on the note shown, fresh for every card. */
  protected readonly cursorStart = computed(() => {
    const spot = this.session.spot();
    return spot ? { ...spot } : null;
  });

  /**
   * The note asked about in amber. Once answered, the next note in teal where the shape puts it,
   * and your tap: teal when it's the right note elsewhere, red when it's wrong.
   */
  protected readonly dots = computed((): FretboardDot[] => {
    const card = this.card();
    const spot = this.session.spot();
    if (card?.kind !== 'neck' || !spot) {
      return [];
    }
    const dots: FretboardDot[] = [{ ...spot, label: circleNoteLabel(card.from), kind: 'root' }];
    if (!this.answered()) {
      return dots;
    }
    const target = nextSpot(card.direction, spot);
    dots.push({ ...target, label: circleNoteLabel(card.answer), kind: 'tone' });
    const tapped = this.session.tapped();
    if (tapped && (tapped.string !== target.string || tapped.fret !== target.fret)) {
      const pitchClass = pitchClassAt(tapped);
      dots.push({
        ...tapped,
        label: circleNoteLabel(pitchClass),
        kind: pitchClass === card.answer ? 'tone' : 'miss',
      });
    }
    return dots;
  });

  protected readonly boardDescription = computed(() => {
    const card = this.card();
    const spot = this.session.spot();
    if (card?.kind !== 'neck' || !spot) {
      return '';
    }
    return (
      `Fretboard with ${circleNoteLabel(card.from)} on ` +
      `${stringLabel(spot.string)}, fret ${spot.fret}. Find the next note round.`
    );
  });
}
