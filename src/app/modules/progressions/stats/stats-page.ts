import { Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { levelOf } from '../../../core/practice/tempo-ladder';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { TrendChart, TrendPoint } from '../../../core/ui/stats/trend-chart';
import { cardFromKey, chordsText } from '../deck';
import { ProgressionsSession } from '../progressions-session';

/** Takes on the chart: weeks of practice of one progression. */
const CHARTED = 40;

@Component({
  selector: 'app-progressions-stats-page',
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
  `,
  host: { class: 'page' },
})
export class StatsPage {
  private readonly session = inject(ProgressionsSession);
  protected readonly takes = this.session.takes;

  /** The progressions you've played, most played first. */
  protected readonly played = computed(() => {
    const counts = new Map<string, number>();
    for (const take of this.takes()) {
      counts.set(take.progression, (counts.get(take.progression) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .flatMap(([key, count]) => {
        const card = cardFromKey(key);
        return card ? [{ key, name: chordsText(card), count }] : [];
      });
  });

  /** Where each progression stands: its tempo now, the best it passed, its last take. */
  protected readonly rows = computed(() =>
    this.played().map(({ key, name, count }) => {
      const takes = this.takes().filter((take) => take.progression === key);
      const passedTempos = takes.filter((take) => take.passed).map((take) => take.bpm);
      const last = takes[takes.length - 1];
      return {
        key,
        name,
        now: `${levelOf(this.session.levels(), key, this.session.settings().startTempo).bpm} bpm`,
        best: passedTempos.length > 0 ? `${Math.max(...passedTempos)} bpm` : '–',
        last: `${last.onTime} of ${last.total}`,
        count,
      };
    }),
  );

  protected readonly choices = computed((): Choice<string>[] =>
    this.played().map(({ key, name }) => ({ value: key, label: name })),
  );

  /** The progression on the chart: the one played last, until you pick another. */
  protected readonly charted = linkedSignal(() => this.takes().at(-1)?.progression ?? '');

  protected readonly points = computed((): TrendPoint[] =>
    this.takes()
      .filter((take) => take.progression === this.charted())
      .slice(-CHARTED)
      .map((take) => ({ id: String(take.at), at: take.at, value: take.bpm })),
  );

  protected readonly describe = (value: number) => `${value} bpm`;
}
