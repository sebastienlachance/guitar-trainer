import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COMMON_NOTE_NAMES, commonNoteName } from '../../../core/music/notes';
import { SCALE_TYPES } from '../../../core/music/scales';
import { totals } from '../../../core/practice/stats';
import { AccuracyGrid, AccuracyRow, accuracyCell } from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { CardDescription, WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { cardFromKey, positionLabel } from '../deck';
import { ScalesSession } from '../scales-session';

function describeCard(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card ? { title: card.scale.name, detail: positionLabel(card) } : undefined;
}

@Component({
  selector: 'app-scales-stats-page',
  imports: [RouterLink, StatsOverview, SessionHistory, AccuracyGrid, WeakestCards, ResetStats],
  templateUrl: './stats-page.html',
  host: { class: 'page' },
})
export class StatsPage {
  private readonly session = inject(ScalesSession);
  private readonly stats = this.session.run.stats;

  protected readonly describeCard = describeCard;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly roots = COMMON_NOTE_NAMES.map((name, root) => ({
    id: name,
    label: commonNoteName(root),
  }));

  /** Accuracy per scale and root, for the scales you chose or have practised. */
  protected readonly grid = computed((): AccuracyRow[] => {
    const stats = this.stats();
    const selected = this.session.settings().scales;
    const practised = (id: string) => Object.keys(stats).some((key) => key.startsWith(`${id}|`));
    return SCALE_TYPES.filter((scale) => selected.includes(scale.id) || practised(scale.id)).map(
      (scale) => ({
        id: scale.id,
        label: scale.name,
        cells: COMMON_NOTE_NAMES.map((root) =>
          accuracyCell(
            root,
            totals(stats, (key) => key.startsWith(`${scale.id}|${root}|`)),
          ),
        ),
      }),
    );
  });
}
