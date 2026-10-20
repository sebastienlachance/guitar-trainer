import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { totals } from '../../../core/practice/stats';
import { AccuracyGrid, AccuracyRow, accuracyCell } from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { CardDescription, WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { EAR_INTERVALS, cardFromKey, describeCard } from '../deck';
import { PlaybackSession } from '../playback-session';

function describe(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card ? describeCard(card) : undefined;
}

@Component({
  selector: 'app-playback-stats-page',
  imports: [RouterLink, StatsOverview, SessionHistory, AccuracyGrid, WeakestCards, ResetStats],
  templateUrl: './stats-page.html',
  host: { class: 'page' },
})
export class StatsPage {
  private readonly stats = inject(PlaybackSession).run.stats;

  protected readonly describeCard = describe;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly intervals = EAR_INTERVALS.map((interval) => ({
    id: interval.id,
    label: interval.id,
  }));

  /** Accuracy per interval, going up and going down; null before any interval is answered. */
  protected readonly grid = computed((): AccuracyRow[] | null => {
    const stats = this.stats();
    if (totals(stats, (key) => key.startsWith('interval:')).attempts === 0) {
      return null;
    }
    return (['up', 'down'] as const).map((direction) => ({
      id: direction,
      label: direction === 'up' ? 'Up' : 'Down',
      cells: EAR_INTERVALS.map((interval) =>
        accuracyCell(
          interval.id,
          totals(stats, (key) => key === `interval:${interval.id}:${direction}`),
        ),
      ),
    }));
  });
}
