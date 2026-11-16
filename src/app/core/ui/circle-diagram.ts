import { Component, computed, input } from '@angular/core';
import { circleNoteLabel, clockPosition } from '../music/circle';

const CENTER = 100;
/** Where the note names sit. */
const NOTE_RADIUS = 78;
/** Where the arrow from one note to the next runs, inside the names. */
const ARROW_RADIUS = 54;
const ARROW_HEAD = 7;

type NoteKind = 'from' | 'to' | 'wrong' | 'other';

interface PlacedNote {
  readonly pitchClass: number;
  readonly label: string;
  readonly kind: NoteKind;
  readonly x: number;
  readonly y: number;
}

/** The angle of a pitch class on the drawing, in radians: C at the top, fifths clockwise. */
function angleOf(pitchClass: number): number {
  return ((clockPosition(pitchClass) * 30 - 90) * Math.PI) / 180;
}

function pointAt(angle: number, radius: number): { x: number; y: number } {
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

/** How far round from one angle to another, clockwise (positive) or not, in (-2π, 2π). */
function sweepBetween(start: number, end: number, clockwise: boolean | null): number {
  const forward = (((end - start) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  if (clockwise === null) {
    return forward > Math.PI ? forward - 2 * Math.PI : forward;
  }
  return clockwise ? forward : forward - 2 * Math.PI;
}

/** An arc from one note to the other, with a head at the end; none from a note to itself. */
function arrowPath(from: number, to: number, clockwiseWay: boolean | null): string {
  if (from === to) {
    return '';
  }
  const start = angleOf(from);
  const sweep = sweepBetween(start, angleOf(to), clockwiseWay);
  const end = start + sweep;
  const clockwise = sweep > 0;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const tail = pointAt(start, ARROW_RADIUS);
  const tip = pointAt(end, ARROW_RADIUS);
  // The head's two strokes point back along the arc, 30 degrees either side of it.
  const back = Math.atan2(Math.cos(end), -Math.sin(end)) + (clockwise ? Math.PI : 0);
  const barb = (turn: number) => ({
    x: tip.x + ARROW_HEAD * Math.cos(back + turn),
    y: tip.y + ARROW_HEAD * Math.sin(back + turn),
  });
  const [left, right] = [barb(Math.PI / 6), barb(-Math.PI / 6)];
  const f = (value: number) => value.toFixed(1);
  return (
    `M${f(tail.x)} ${f(tail.y)}` +
    `A${ARROW_RADIUS} ${ARROW_RADIUS} 0 ${largeArc} ${clockwise ? 1 : 0} ${f(tip.x)} ${f(tip.y)}` +
    `M${f(left.x)} ${f(left.y)}L${f(tip.x)} ${f(tip.y)}L${f(right.x)} ${f(right.y)}`
  );
}

/**
 * The circle of fifths, C at the top and fifths clockwise, with an arrow from one note to
 * another: where a step round the circle goes, or how far a key is from C. A wrong answer can be
 * marked too.
 */
@Component({
  selector: 'app-circle-diagram',
  template: `
    <svg viewBox="0 0 200 200" role="img" [attr.aria-label]="description()">
      @if (arrow()) {
        <path class="step" [attr.d]="arrow()" />
      }
      @for (note of notes(); track note.pitchClass) {
        <g [attr.class]="'note ' + note.kind">
          <circle [attr.cx]="note.x" [attr.cy]="note.y" r="15" />
          <text [attr.x]="note.x" [attr.y]="note.y">{{ note.label }}</text>
        </g>
      }
    </svg>
  `,
  styles: `
    :host {
      display: block;
    }

    svg {
      display: block;
      width: 100%;
      max-width: 220px;
      margin: 0 auto;
    }

    .note circle {
      fill: none;
    }

    .note text {
      fill: var(--text-muted);
      font-size: 14px;
      text-anchor: middle;
      dominant-baseline: central;
    }

    .note.from circle {
      stroke: var(--text);
      stroke-width: 2;
    }

    .note.from text {
      fill: var(--text);
    }

    .note.to circle {
      fill: var(--tone);
    }

    .note.to text {
      fill: var(--on-tone);
      font-weight: 600;
    }

    .note.wrong circle {
      stroke: var(--danger);
      stroke-width: 2;
    }

    .note.wrong text {
      fill: var(--danger);
    }

    .step {
      fill: none;
      stroke: var(--tone);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class CircleDiagram {
  /** The pitch class the step starts from. */
  readonly from = input.required<number>();
  /** The pitch class it lands on. */
  readonly to = input.required<number>();
  /** A wrong answer to mark, if there was one. */
  readonly wrong = input<number | null>(null);
  /** Which way the arrow goes round, clockwise being fifths; null for the short way. */
  readonly clockwise = input<boolean | null>(null);

  protected readonly notes = computed((): PlacedNote[] =>
    Array.from({ length: 12 }, (_, pitchClass) => ({
      pitchClass,
      label: circleNoteLabel(pitchClass),
      kind: this.kindOf(pitchClass),
      ...pointAt(angleOf(pitchClass), NOTE_RADIUS),
    })),
  );

  protected readonly arrow = computed(() => arrowPath(this.from(), this.to(), this.clockwise()));

  protected readonly description = computed(() => {
    const wrong = this.wrong();
    const step =
      this.from() === this.to()
        ? circleNoteLabel(this.to())
        : `${circleNoteLabel(this.from())} to ${circleNoteLabel(this.to())}`;
    return `Circle of fifths: ${step}` + (wrong === null ? '' : `, not ${circleNoteLabel(wrong)}`);
  });

  private kindOf(pitchClass: number): NoteKind {
    if (pitchClass === this.to()) {
      return 'to';
    }
    if (pitchClass === this.from()) {
      return 'from';
    }
    return pitchClass === this.wrong() ? 'wrong' : 'other';
  }
}
