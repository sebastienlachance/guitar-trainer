import { Component, computed, inject } from '@angular/core';
import { FretPosition, Fretboard, FretboardDot } from '../../../core/fretboard/fretboard';
import { IntervalName, displayInterval, intervalLongName } from '../../../core/music/intervals';
import { scaleFormula } from '../../../core/music/scales';
import { AnswerOption, CheckedAnswer, ChoiceButtons } from '../../../core/ui/answer/choice-buttons';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { intervalAt, scaleLabel } from '../deck';
import { IntervalsSession } from '../intervals-session';

function positionKey(position: FretPosition): string {
  return `${position.string}:${position.fret}`;
}

function place({ string, fret }: FretPosition): FretPosition {
  return { string, fret };
}

/**
 * A scale shape around its root. Find: tap (or play) the asked interval. Name: say which interval
 * the marked note is. Once answered, every dot shows its interval and the formula appears.
 */
@Component({
  selector: 'app-intervals-practice-page',
  imports: [PracticeFrame, Fretboard, ChoiceButtons, MicStatus],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
})
export class PracticePage {
  protected readonly session = inject(IntervalsSession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;
  private readonly question = this.session.question;

  protected readonly answered = computed(() => this.run.phase() === 'answered');

  protected readonly asked = computed(() => {
    const card = this.card();
    return card ? displayInterval(card.interval) : '';
  });

  protected readonly askedName = computed(() => {
    const card = this.card();
    return card ? intervalLongName(card.interval) : '';
  });

  protected readonly scale = computed(() => {
    const card = this.card();
    const question = this.question();
    return card && question ? scaleLabel(card, question) : '';
  });

  protected readonly rootString = computed(() => `root on string ${this.card()?.rootString}`);

  protected readonly window = computed(() => {
    const start = this.question()?.start ?? 1;
    return { first: start, last: start + 4 };
  });

  /** The keyboard cursor starts on the root, fresh for every question. */
  protected readonly cursorStart = computed(() => {
    const card = this.card();
    const question = this.question();
    return card && question ? { string: card.rootString, fret: question.start + 1 } : null;
  });

  protected readonly micOn = computed(
    () => this.session.micListens() && this.card()?.task === 'find',
  );

  /**
   * Roots in amber, the rest of the shape as faint rings (when shown). Name marks its note with
   * "?". Once answered, every dot is labelled, Find shows each place of the interval in teal, and
   * a wrong tap is red.
   */
  protected readonly dots = computed((): FretboardDot[] => {
    const card = this.card();
    const question = this.question();
    if (!card || !question) {
      return [];
    }
    const answered = this.answered();
    const showShape = answered || this.session.settings().neck === 'shape';
    const label = (tone: IntervalName) => (answered ? displayInterval(tone) : '');
    const dots = new Map<string, FretboardDot>();
    const add = (dot: FretboardDot) => dots.set(positionKey(dot), dot);

    for (const note of question.notes) {
      if (note.tone === '1') {
        add({ ...place(note), label: label(note.tone), kind: 'root' });
      } else if (showShape) {
        add({ ...place(note), label: label(note.tone), kind: 'ghost' });
      }
    }
    if (card.task === 'name') {
      const marked = question.marked;
      add({ ...place(marked), label: answered ? displayInterval(marked.tone) : '?', kind: 'tone' });
    } else if (answered) {
      for (const note of question.notes.filter((note) => note.tone === card.interval)) {
        add({ ...place(note), label: label(note.tone), kind: 'tone' });
      }
      const tapped = this.session.tapped();
      if (tapped) {
        const hit = this.session
          .targets()
          .some((target) => positionKey(target) === positionKey(tapped));
        const tone = intervalAt(card, question, tapped);
        add({ ...place(tapped), label: displayInterval(tone), kind: hit ? 'tone' : 'miss' });
      }
    }
    return [...dots.values()];
  });

  /** After a wrong Find answer: what you tapped. */
  protected readonly correction = computed(() => {
    const card = this.card();
    const question = this.question();
    const tapped = this.session.tapped();
    if (!card || !question || !tapped || !this.answered() || this.run.lastCorrect()) {
      return '';
    }
    const tone = intervalAt(card, question, tapped);
    return `That's the ${displayInterval(tone)} (${intervalLongName(tone)}).`;
  });

  protected readonly formula = computed(() => {
    const card = this.card();
    return card ? `${card.scale.name}: ${scaleFormula(card.scale)}` : '';
  });

  protected readonly options = computed((): AnswerOption<IntervalName>[] =>
    this.session
      .choices()
      .map((interval) => ({ value: interval, label: displayInterval(interval) })),
  );

  protected readonly checked = computed((): CheckedAnswer<IntervalName> | null => {
    const card = this.card();
    const picked = this.session.picked();
    return card && picked !== null ? { picked, correct: card.interval } : null;
  });

  protected readonly description = computed(() => {
    const card = this.card();
    const question = this.question();
    if (!card || !question) {
      return '';
    }
    const shape =
      this.session.settings().neck === 'shape' ? ', the other scale notes as rings' : '';
    const board = `Fretboard, frets ${question.start} to ${question.start + 4}: ${this.scale()}, roots in amber${shape}`;
    return card.task === 'find'
      ? `${board}. Find the ${this.askedName()}.`
      : `${board}. The marked note is on string ${question.marked.string}, fret ${question.marked.fret}.`;
  });

  protected readonly micHint = computed(() => `play the ${this.asked()}`);
}
