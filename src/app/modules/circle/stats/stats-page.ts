import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CIRCLE_DIRECTIONS,
  CIRCLE_OF_FOURTHS,
  CircleDirection,
  circleNoteLabel,
} from '../../../core/music/circle';
import { totals } from '../../../core/practice/stats';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import {
  AccuracyGrid,
  AccuracyRow,
  accuracyCell,
  speedCell,
} from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { TrendChart, TrendPoint } from '../../../core/ui/stats/trend-chart';
import { WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { formatSeconds } from '../../../core/ui/text';
import { CircleSession } from '../circle-session';
import { DIRECTION_LABELS, GRID_ROWS, describeCard } from '../deck';
import { bestLapMs } from '../laps';

/** Laps on the chart: weeks of practice. */
const CHARTED = 40;

@Component({
  selector: 'app-circle-stats-page',
  imports: [
    RouterLink,
    StatsOverview,
    SessionHistory,
    SegmentedChoice,
    AccuracyGrid,
    TrendChart,
    WeakestCards,
    ResetStats,
  ],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.css',
  host: { class: 'page' },
})
export class StatsPage {
  private readonly session = inject(CircleSession);
  private readonly stats = this.session.run.stats;
  protected readonly laps = this.session.laps;

  protected readonly describeCard = describeCard;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly notes = CIRCLE_OF_FOURTHS.map((pitchClass) => ({
    id: String(pitchClass),
    label: circleNoteLabel(pitchClass),
  }));

  /** Speed shows progress best: with the microphone, a wrong note played isn't a miss. */
  protected readonly measure = signal<'time' | 'accuracy'>('time');
  protected readonly measures: Choice<'time' | 'accuracy'>[] = [
    { value: 'time', label: 'Time' },
    { value: 'accuracy', label: 'Accuracy' },
  ];

  /**
   * Time or accuracy per note (or per key), for the kinds of question in your settings or that
   * you've practised.
   */
  protected readonly grid = computed((): AccuracyRow[] => {
    const stats = this.stats();
    const byTime = this.measure() === 'time';
    const inDeck = new Set(this.session.deck().map((card) => card.key));
    return GRID_ROWS.filter((row) =>
      CIRCLE_OF_FOURTHS.some((note) => inDeck.has(row.keyFor(note)) || stats[row.keyFor(note)]),
    ).map((row) => ({
      id: row.id,
      label: row.label,
      cells: CIRCLE_OF_FOURTHS.map((note) => {
        const key = row.keyFor(note);
        return byTime
          ? speedCell(String(note), stats[key] ? [stats[key]] : [])
          : accuracyCell(
              String(note),
              totals(stats, (each) => each === key),
            );
      }),
    }));
  });

  /** Each way round you've lapped: best and last lap, and how many. */
  protected readonly lapRows = computed(() =>
    CIRCLE_DIRECTIONS.flatMap((direction) => {
      const laps = this.laps().filter((lap) => lap.direction === direction);
      const last = laps.at(-1);
      return last
        ? [
            {
              direction,
              label: DIRECTION_LABELS[direction],
              best: formatSeconds(bestLapMs(laps, direction) ?? 0),
              last: formatSeconds(last.ms),
              count: laps.length,
            },
          ]
        : [];
    }),
  );

  protected readonly lapChoices = computed((): Choice<CircleDirection>[] =>
    this.lapRows().map((row) => ({ value: row.direction, label: row.label })),
  );

  /** The way round on the chart: the one lapped last, until you pick the other. */
  protected readonly charted = linkedSignal(() => this.laps().at(-1)?.direction ?? 'fourths');

  protected readonly lapPoints = computed((): TrendPoint[] =>
    this.laps()
      .filter((lap) => lap.direction === this.charted())
      .slice(-CHARTED)
      .map((lap) => ({ id: String(lap.at), at: lap.at, value: lap.ms / 1000 })),
  );

  protected readonly describeLap = (seconds: number) => `${seconds.toFixed(1)} s a lap`;
}
