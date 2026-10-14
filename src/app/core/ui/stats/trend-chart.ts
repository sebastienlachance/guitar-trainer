import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

/** One plotted value, such as a session's pace or a take's timing. */
export interface TrendPoint {
  readonly id: string;
  /** Epoch milliseconds, for the dates under the chart and in tooltips. */
  readonly at: number;
  readonly value: number;
}

/** Tops of the scale within each power of ten, fine enough that the line fills the chart. */
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** The top of the scale: the smallest round number at or above the value, e.g. 11.7 -> 12. */
export function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const power = 10 ** Math.floor(Math.log10(value));
  return NICE_STEPS.map((step) => step * power).find((top) => top >= value) ?? 10 * power;
}

/** Drawing width before the real one is measured (and in tests, which can't measure). */
const DEFAULT_WIDTH = 600;
const MIN_WIDTH = 240;
const LEFT = 40;
const RIGHT_MARGIN = 14;
const TOP = 12;
const BASELINE = 128;

const shortDate = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/**
 * A value over time, oldest to newest: one line in the accent colour, from zero up, with a
 * tooltip on each point. Pair it with a table of the same data.
 */
@Component({
  selector: 'app-trend-chart',
  template: `
    @if (chart(); as chart) {
      <svg [attr.viewBox]="'0 0 ' + width() + ' 150'" role="img" [attr.aria-label]="chart.summary">
        @for (line of chart.gridlines; track line.y) {
          <line
            [class]="line.base ? 'base' : 'grid'"
            [attr.x1]="left"
            [attr.x2]="right()"
            [attr.y1]="line.y"
            [attr.y2]="line.y"
          />
          <text class="tick" [attr.x]="left - 8" [attr.y]="line.y + 4">{{ line.label }}</text>
        }
        <polyline class="trend" [attr.points]="chart.path" />
        @for (point of chart.points; track point.id) {
          <g class="point">
            <title>{{ point.tooltip }}</title>
            <circle class="hit" [attr.cx]="point.x" [attr.cy]="point.y" r="14" />
            <circle class="dot" [attr.cx]="point.x" [attr.cy]="point.y" r="5" />
          </g>
        }
        <text class="tick start" [attr.x]="left" y="146">{{ chart.first }}</text>
        <text class="tick end" [attr.x]="right()" y="146">{{ chart.last }}</text>
      </svg>
    } @else {
      <p class="muted empty">{{ empty() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .empty {
      margin: 0;
      padding: 12px 0;
      font-size: 13px;
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
      margin: 8px 0 4px;
      font-family: var(--font);
    }
    .grid {
      stroke: var(--border);
    }
    .base {
      stroke: var(--border-strong);
    }
    .tick {
      fill: var(--text-muted);
      font-size: 12px;
      text-anchor: end;
    }
    .tick.start {
      text-anchor: start;
    }
    .trend {
      fill: none;
      stroke: var(--accent);
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .dot {
      fill: var(--accent);
      stroke: var(--surface);
      stroke-width: 2;
    }
    .hit {
      fill: transparent;
    }
    .point:hover .dot {
      stroke: var(--text);
    }
  `,
})
export class TrendChart {
  /** The values, oldest first. */
  readonly points = input.required<readonly TrendPoint[]>();
  /** A value in words, for tooltips and the screen-reader summary: "11.7 chords per minute". */
  readonly describe = input.required<(value: number) => string>();
  /** What a point is, plural, for the summary: "sessions", "takes". */
  readonly pointNoun = input.required<string>();
  /** Shown instead of the chart until there are two points to draw a line through. */
  readonly empty = input.required<string>();

  protected readonly left = LEFT;
  /**
   * The drawing is as wide as its box, one unit per pixel, so text and dots keep their size on a
   * phone instead of shrinking with the whole picture.
   */
  protected readonly width = signal(DEFAULT_WIDTH);
  protected readonly right = computed(() => this.width() - RIGHT_MARGIN);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(([entry]) =>
        this.width.set(Math.max(MIN_WIDTH, Math.round(entry.contentRect.width))),
      );
      observer.observe(host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected readonly chart = computed(() => {
    const values = this.points();
    if (values.length < 2) {
      return null;
    }
    const top = niceMax(Math.max(...values.map((point) => point.value)));
    const right = this.right();
    const x = (index: number) => LEFT + 12 + (index * (right - LEFT - 24)) / (values.length - 1);
    const y = (value: number) => BASELINE - (value / top) * (BASELINE - TOP);
    const describe = this.describe();
    const points = values.map((point, index) => ({
      id: point.id,
      x: x(index),
      y: y(point.value),
      tooltip: `${shortDate(point.at)}: ${describe(point.value)}`,
    }));
    const first = values[0];
    const last = values[values.length - 1];
    return {
      points,
      path: points.map((point) => `${point.x},${point.y}`).join(' '),
      gridlines: [0, top / 2, top].map((value) => ({
        y: y(value),
        label: String(value),
        base: value === 0,
      })),
      first: shortDate(first.at),
      last: shortDate(last.at),
      summary:
        `Over ${values.length} ${this.pointNoun()}, from ${describe(first.value)} ` +
        `to ${describe(last.value)}.`,
    };
  });
}
