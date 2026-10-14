import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { TrendChart, TrendPoint } from '../../../core/ui/stats/trend-chart';
import { SUBDIVISIONS, levelOf } from '../deck';
import { RhythmSession } from '../rhythm-session';

/** Takes on the chart: enough for weeks of practice of one subdivision. */
const CHARTED = 40;

type Measure = 'tempo' | 'timing';

@Component({
  selector: 'app-rhythm-stats-page',
  imports: [RouterLink, SegmentedChoice, TrendChart, SessionHistory],
  templateUrl: './stats-page.html',
  styles: `
    .scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      white-space: nowrap;
    }
    th,
    td {
      padding: 8px 8px 8px 0;
      text-align: left;
      border-top: 1px solid var(--border);
    }
    th {
      font-weight: 400;
      color: var(--text-muted);
    }
    .choices {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin-bottom: 4px;
    }
  `,
  host: { class: 'page' },
})
export class StatsPage {
  private readonly session = inject(RhythmSession);
  protected readonly takes = this.session.takes;

  /** The subdivisions you've played, in the usual order. */
  protected readonly played = computed(() =>
    SUBDIVISIONS.filter((subdivision) =>
      this.takes().some((take) => take.subdivision === subdivision.id),
    ),
  );

  /** Where each played subdivision stands: its tempo now, the best it passed, its last timing. */
  protected readonly rows = computed(() =>
    this.played().map((subdivision) => {
      const takes = this.takes().filter((take) => take.subdivision === subdivision.id);
      const passedTempos = takes.filter((take) => take.passed).map((take) => take.bpm);
      const level = levelOf(
        this.session.levels(),
        { key: subdivision.id, subdivision },
        this.session.settings().startTempo,
      );
      return {
        id: subdivision.id,
        name: subdivision.name,
        now: `${level.bpm} bpm`,
        best: passedTempos.length > 0 ? `${Math.max(...passedTempos)} bpm` : '–',
        timing: `${takes[takes.length - 1].meanAbsMs} ms`,
        count: takes.length,
      };
    }),
  );

  protected readonly subdivisionChoices = computed((): Choice<string>[] =>
    this.played().map((subdivision) => ({ value: subdivision.id, label: subdivision.name })),
  );

  /** The subdivision on the chart: the one played last, until you pick another. */
  protected readonly charted = linkedSignal(() => this.takes().at(-1)?.subdivision ?? '');

  protected readonly measure = signal<Measure>('tempo');
  protected readonly measures: Choice<Measure>[] = [
    {
      value: 'tempo',
      label: 'Tempo',
      hint: 'The tempo of each take: it climbs as you pass.',
    },
    {
      value: 'timing',
      label: 'Timing',
      hint: 'How far from the beat your hits were on average, early or late: lower is steadier.',
    },
  ];

  protected readonly points = computed((): TrendPoint[] =>
    this.takes()
      .filter((take) => take.subdivision === this.charted())
      .slice(-CHARTED)
      .map((take) => ({
        id: String(take.at),
        at: take.at,
        value: this.measure() === 'tempo' ? take.bpm : take.meanAbsMs,
      })),
  );

  protected readonly describe = computed(() =>
    this.measure() === 'tempo'
      ? (value: number) => `${value} bpm`
      : (value: number) => `${Math.round(value)} ms off the beat`,
  );
}
