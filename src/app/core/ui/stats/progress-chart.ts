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
import { SessionRecord, answersPerMinute, averageAnswerMs } from '../../practice/session-log';
import { Choice, SegmentedChoice } from '../setup/segmented-choice';
import { capitalize } from '../text';

/** rate: answers per minute of active time; time: average seconds per answer. */
export type ProgressMetric = 'rate' | 'time';

/** One plotted session. */
export interface ProgressPoint {
  readonly id: string;
  readonly startedAt: number;
  readonly value: number;
}

/** The sessions that have the metric, oldest first. Older sessions have no time per answer. */
export function progressPoints(
  records: readonly SessionRecord[],
  metric: ProgressMetric,
): ProgressPoint[] {
  return records.flatMap((record) => {
    const ms = metric === 'time' ? averageAnswerMs(record) : null;
    const value = metric === 'rate' ? answersPerMinute(record) : ms === null ? null : ms / 1000;
    return value === null ? [] : [{ id: record.id, startedAt: record.startedAt, value }];
  });
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
 * Your pace session after session: answers per minute, or the average time per answer. One line
 * in the accent colour; each point has a tooltip, and the session table below is the data view.
 */
@Component({
  selector: 'app-progress-chart',
  imports: [SegmentedChoice],
  template: `
    <div class="head">
      <p class="muted caption">{{ caption() }}</p>
      <app-segmented-choice
        label="Progress measure"
        [hideLabel]="true"
        [options]="metrics"
        [value]="metric()"
        (valueChange)="metric.set($event)"
      />
    </div>
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
      <p class="muted empty">
        @if (metric() === 'time') {
          Time per {{ unit() }} is kept from now on: a couple more sessions and it shows here.
        } @else {
          A couple more sessions and your pace shows here.
        }
      </p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px 12px;
      flex-wrap: wrap;
    }
    .caption,
    .empty {
      margin: 0;
      font-size: 13px;
    }
    .empty {
      padding: 12px 0;
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
export class ProgressChart {
  /** The sessions to plot, oldest first. */
  readonly records = input.required<readonly SessionRecord[]>();
  /** What an answer is called, e.g. "chord". */
  readonly unit = input.required<string>();

  protected readonly metric = signal<ProgressMetric>('rate');
  protected readonly metrics: Choice<ProgressMetric>[] = [
    { value: 'rate', label: 'Per minute' },
    { value: 'time', label: 'Time each' },
  ];
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

  private readonly describe = computed(() =>
    this.metric() === 'rate'
      ? (value: number) => `${value.toFixed(1)} ${this.unit()}s per minute`
      : (value: number) => `${value.toFixed(1)} s per ${this.unit()}`,
  );

  protected readonly caption = computed(() =>
    this.metric() === 'rate'
      ? capitalize(`${this.unit()}s per minute of practice`)
      : `Seconds per ${this.unit()}, lower is faster`,
  );

  /** The plot, or null with fewer than two sessions to draw a line through. */
  protected readonly chart = computed(() => {
    const values = progressPoints(this.records(), this.metric());
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
      tooltip: `${shortDate(point.startedAt)}: ${describe(point.value)}`,
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
      first: shortDate(first.startedAt),
      last: shortDate(last.startedAt),
      summary:
        `Over ${values.length} sessions, from ${describe(first.value)} ` +
        `to ${describe(last.value)}.`,
    };
  });
}
