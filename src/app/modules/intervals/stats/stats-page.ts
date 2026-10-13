import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IntervalName, displayInterval, semitonesOf } from '../../../core/music/intervals';
import { SCALE_TYPES } from '../../../core/music/scales';
import { totals } from '../../../core/practice/stats';
import { AccuracyGrid, AccuracyRow, accuracyCell } from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { CardDescription, WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { askedIntervals, cardFromKey, describe } from '../deck';
import { IntervalsSession } from '../intervals-session';

function describeCard(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card ? describe(card) : undefined;
}

/** Scale id and interval of a stats key such as "find|minor-pentatonic|6|b3". */
function scaleAndInterval(key: string): [string, string] {
  const [, scaleId, , interval] = key.split('|');
  return [scaleId, interval];
}

@Component({
  selector: 'app-intervals-stats-page',
  imports: [RouterLink, StatsOverview, SessionHistory, AccuracyGrid, WeakestCards, ResetStats],
  templateUrl: './stats-page.html',
  host: { class: 'page' },
})
export class StatsPage {
  private readonly session = inject(IntervalsSession);
  private readonly stats = this.session.run.stats;

  protected readonly describeCard = describeCard;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);

  /** The scales you chose or have practised. */
  private readonly scales = computed(() => {
    const selected = this.session.settings().scales;
    const practised = new Set(Object.keys(this.stats()).map((key) => scaleAndInterval(key)[0]));
    return SCALE_TYPES.filter((scale) => selected.includes(scale.id) || practised.has(scale.id));
  });

  /** Every interval those scales have, from the 2nd up. */
  protected readonly intervals = computed(() => {
    const intervals = new Set<IntervalName>(this.scales().flatMap(askedIntervals));
    return [...intervals]
      .sort((a, b) => semitonesOf(a) - semitonesOf(b))
      .map((interval) => ({ id: interval, label: displayInterval(interval) }));
  });

  /** Accuracy per scale and interval, Find and Name together. */
  protected readonly grid = computed((): AccuracyRow[] => {
    const stats = this.stats();
    return this.scales().map((scale) => ({
      id: scale.id,
      label: scale.name,
      cells: this.intervals().map(({ id }) =>
        accuracyCell(
          id,
          totals(stats, (key) => {
            const [scaleId, interval] = scaleAndInterval(key);
            return scaleId === scale.id && interval === id;
          }),
        ),
      ),
    }));
  });
}
