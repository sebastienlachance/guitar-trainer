import { Component, computed, input, signal } from '@angular/core';
import { SessionRecord, answersPerMinute, averageAnswerMs } from '../../practice/session-log';
import { Choice, SegmentedChoice } from '../setup/segmented-choice';
import { capitalize } from '../text';
import { TrendChart, TrendPoint } from './trend-chart';

/** rate: answers per minute of active time; time: average seconds per answer. */
export type ProgressMetric = 'rate' | 'time';

/** The sessions that have the metric, oldest first. Older sessions have no time per answer. */
export function progressPoints(
  records: readonly SessionRecord[],
  metric: ProgressMetric,
): TrendPoint[] {
  return records.flatMap((record) => {
    const ms = metric === 'time' ? averageAnswerMs(record) : null;
    const value = metric === 'rate' ? answersPerMinute(record) : ms === null ? null : ms / 1000;
    return value === null ? [] : [{ id: record.id, at: record.startedAt, value }];
  });
}

/** Your pace session after session: answers per minute, or the average time per answer. */
@Component({
  selector: 'app-progress-chart',
  imports: [SegmentedChoice, TrendChart],
  template: `
    <div class="head">
      <p class="muted caption">{{ caption() }}</p>
      @if (timed()) {
        <app-segmented-choice
          label="Progress measure"
          [hideLabel]="true"
          [options]="metrics"
          [value]="metric()"
          (valueChange)="chosenMetric.set($event)"
        />
      }
    </div>
    <app-trend-chart
      [points]="points()"
      [describe]="describe()"
      pointNoun="sessions"
      [empty]="empty()"
    />
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
    .caption {
      margin: 0;
      font-size: 13px;
    }
  `,
})
export class ProgressChart {
  /** The sessions to plot, oldest first. */
  readonly records = input.required<readonly SessionRecord[]>();
  /** What an answer is called, e.g. "chord". */
  readonly unit = input.required<string>();
  /** Whether answers are timed; without times, only the pace is charted. */
  readonly timed = input(true);

  protected readonly chosenMetric = signal<ProgressMetric>('rate');
  protected readonly metric = computed(() => (this.timed() ? this.chosenMetric() : 'rate'));
  protected readonly metrics: Choice<ProgressMetric>[] = [
    { value: 'rate', label: 'Per minute' },
    { value: 'time', label: 'Time each' },
  ];

  protected readonly points = computed(() => progressPoints(this.records(), this.metric()));

  protected readonly describe = computed(() =>
    this.metric() === 'rate'
      ? (value: number) => `${value.toFixed(1)} ${this.unit()}s per minute`
      : (value: number) => `${value.toFixed(1)} s per ${this.unit()}`,
  );

  protected readonly caption = computed(() =>
    this.metric() === 'rate'
      ? capitalize(`${this.unit()}s per minute of practice`)
      : `Seconds per ${this.unit()}, lower is faster`,
  );

  protected readonly empty = computed(() =>
    this.metric() === 'time'
      ? `Time per ${this.unit()} is kept from now on: a couple more sessions and it shows here.`
      : 'A couple more sessions and your pace shows here.',
  );
}
