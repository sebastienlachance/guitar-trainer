import { Component, computed, inject } from '@angular/core';
import { FretboardDot, Fretboard } from '../../../core/fretboard/fretboard';
import { Icon } from '../../../core/ui/icon';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { BendsSession } from '../bends-session';
import { noteName, sizeName } from '../deck';
import { IN_TUNE_CENTS } from '../judge';

/** The bend's drawing, in its own units: 320 wide, 140 high. */
const WIDTH = 320;
const HEIGHT = 140;
const LEFT = 30;
const MARGIN = 14;
/** The drawing shows at least this long, in milliseconds, so a short bend isn't stretched. */
const MIN_SPAN_MS = 1500;

/**
 * Bends: pick the fretted note, bend it up to the target and hold it there. The bend draws as you
 * play it; T plays the target pitch.
 */
@Component({
  selector: 'app-bends-practice-page',
  imports: [Fretboard, Icon, MicStatus, PracticeFrame],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class PracticePage {
  protected readonly session = inject(BendsSession);
  protected readonly run = this.session.run;
  protected readonly bend = this.session.bend;
  protected readonly verdict = this.session.verdict;
  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly left = LEFT;

  protected readonly size = computed(() => sizeName(this.run.current()?.semitones ?? 2));
  protected readonly startName = computed(() => {
    const bend = this.bend();
    return bend ? noteName(bend.start) : '';
  });
  protected readonly targetName = computed(() => {
    const bend = this.bend();
    return bend ? noteName(bend.target) : '';
  });

  /** The fretted note, and a ring where the target would be fretted. */
  protected readonly dots = computed((): FretboardDot[] => {
    const bend = this.bend();
    if (!bend) {
      return [];
    }
    return [
      { string: bend.string, fret: bend.fret, label: this.startName(), kind: 'root' },
      {
        string: bend.string,
        fret: bend.fret + (bend.target - bend.start),
        label: this.targetName(),
        kind: 'ghost',
      },
    ];
  });

  protected readonly where = computed(() => {
    const bend = this.bend();
    return bend ? `string ${bend.string}, fret ${bend.fret}` : '';
  });

  protected readonly description = computed(
    () =>
      `Pick ${this.startName()} on ${this.where()}; the ring is where ${this.targetName()} is fretted.`,
  );

  /** The bend's target, in cents above the fretted note. */
  private readonly targetCents = computed(() => {
    const bend = this.bend();
    return bend ? (bend.target - bend.start) * 100 : 200;
  });

  /** Height in the drawing for a pitch, in cents above the fretted note. */
  private readonly y = computed(() => {
    const low = -50;
    const high = this.targetCents() + 60;
    return (cents: number) =>
      MARGIN +
      (1 - (Math.min(high, Math.max(low, cents)) - low) / (high - low)) * (HEIGHT - 2 * MARGIN);
  });

  protected readonly startY = computed(() => this.y()(0));
  protected readonly targetY = computed(() => this.y()(this.targetCents()));
  protected readonly bandTop = computed(() => this.y()(this.targetCents() + IN_TUNE_CENTS));
  protected readonly bandHeight = computed(
    () => this.y()(this.targetCents() - IN_TUNE_CENTS) - this.bandTop(),
  );

  /** The bend so far, as a line across the drawing. */
  protected readonly curve = computed(() => {
    const trace = this.session.trace();
    if (trace.length === 0) {
      return '';
    }
    const span = Math.max(MIN_SPAN_MS, trace[trace.length - 1].time);
    const y = this.y();
    return trace
      .map(
        (point) =>
          `${(LEFT + (point.time / span) * (WIDTH - LEFT - 6)).toFixed(1)},${y(point.cents).toFixed(1)}`,
      )
      .join(' ');
  });

  /** "In tune: 3 cents flat", "Not quite: 28 cents flat at the top"… */
  protected readonly verdictText = computed(() => {
    const verdict = this.verdict();
    if (!verdict) {
      return '';
    }
    const off = describeOff(verdict.centsOff);
    if (verdict.kind === 'held') {
      return `In tune: ${off}, held for half a second.`;
    }
    return Math.abs(verdict.centsOff) <= IN_TUNE_CENTS
      ? 'In tune at the top, but not for half a second.'
      : `Not quite: ${off} at the top.`;
  });

  protected readonly tip = computed(() => {
    const verdict = this.verdict();
    if (!verdict || verdict.kind === 'held') {
      return '';
    }
    if (Math.abs(verdict.centsOff) <= IN_TUNE_CENTS) {
      return 'Hold it there a moment longer.';
    }
    return verdict.centsOff < 0
      ? 'Push a little further. Hear the target again to fix it in your ear.'
      : 'Ease off a little: the bend went past the target.';
  });

  /** T plays the target; the practice frame doesn't use it. */
  protected onKeydown(event: KeyboardEvent): void {
    const inControl =
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea') !== null;
    if (
      event.key.toLowerCase() !== 't' ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      inControl ||
      this.run.view() !== 'running'
    ) {
      return;
    }
    this.session.hearTarget();
    event.preventDefault();
  }
}

/** "3 cents flat", "12 cents sharp", or "right on" within half a cent. */
function describeOff(cents: number): string {
  const rounded = Math.round(Math.abs(cents));
  if (rounded === 0) {
    return 'right on';
  }
  return `${rounded} ${rounded === 1 ? 'cent' : 'cents'} ${cents < 0 ? 'flat' : 'sharp'}`;
}
