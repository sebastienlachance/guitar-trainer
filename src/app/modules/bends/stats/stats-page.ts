import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { stringLabel } from '../../../core/fretboard/tuning';
import { totals } from '../../../core/practice/stats';
import { capitalize } from '../../../core/ui/text';
import { AccuracyGrid, AccuracyRow, accuracyCell } from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { CardDescription, WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { BendsSession } from '../bends-session';
import { cardFromKey, describeCard, sizeName } from '../deck';
import { BEND_SIZES, BEND_STRINGS } from '../settings';

function describe(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card ? describeCard(card) : undefined;
}

@Component({
  selector: 'app-bends-stats-page',
  imports: [RouterLink, StatsOverview, SessionHistory, AccuracyGrid, WeakestCards, ResetStats],
  templateUrl: './stats-page.html',
  host: { class: 'page' },
})
export class StatsPage {
  private readonly stats = inject(BendsSession).run.stats;

  protected readonly describeCard = describe;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly sizes = BEND_SIZES.map((semitones) => ({
    id: String(semitones),
    label: capitalize(sizeName(semitones)),
  }));

  /** Bends held in tune, per string and size. */
  protected readonly grid = computed((): AccuracyRow[] => {
    const stats = this.stats();
    return BEND_STRINGS.map((string) => ({
      id: String(string),
      label: stringLabel(string),
      cells: BEND_SIZES.map((semitones) =>
        accuracyCell(
          String(semitones),
          totals(stats, (key) => key === `${string}:${semitones}`),
        ),
      ),
    }));
  });
}
