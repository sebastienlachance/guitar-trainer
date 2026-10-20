import { Component, computed, inject, linkedSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { TrendChart, TrendPoint } from '../../../core/ui/stats/trend-chart';
import { ChangesSession } from '../changes-session';
import { bestPerMinute, cardFromKey, pairName, perMinute } from '../deck';

/** Takes on the chart: weeks of practice of one pair. */
const CHARTED = 40;

@Component({
  selector: 'app-changes-stats-page',
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
  private readonly session = inject(ChangesSession);
  protected readonly takes = this.session.takes;

  /** The pairs you've played, most played first. */
  protected readonly played = computed(() => {
    const counts = new Map<string, number>();
    for (const take of this.takes()) {
      counts.set(take.pair, (counts.get(take.pair) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([, a], [, b]) => b - a)
      .flatMap(([key, count]) => {
        const card = cardFromKey(key);
        return card ? [{ key, name: pairName(card), count }] : [];
      });
  });

  protected readonly rows = computed(() =>
    this.played().map(({ key, name, count }) => {
      const last = this.takes()
        .filter((take) => take.pair === key)
        .at(-1)!;
      return {
        key,
        name,
        best: Math.round(bestPerMinute(this.takes(), key) ?? 0),
        last: Math.round(perMinute(last)),
        count,
      };
    }),
  );

  protected readonly pairChoices = computed((): Choice<string>[] =>
    this.played().map(({ key, name }) => ({ value: key, label: name })),
  );

  /** The pair on the chart: the one played last, until you pick another. */
  protected readonly charted = linkedSignal(() => this.takes().at(-1)?.pair ?? '');

  protected readonly points = computed((): TrendPoint[] =>
    this.takes()
      .filter((take) => take.pair === this.charted())
      .slice(-CHARTED)
      .map((take) => ({ id: String(take.at), at: take.at, value: perMinute(take) })),
  );

  protected readonly describe = (value: number) => `${Math.round(value)} changes a minute`;
}
