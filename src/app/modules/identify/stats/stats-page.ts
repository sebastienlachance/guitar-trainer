import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { STRING_NUMBERS, stringLabel } from '../../../core/fretboard/tuning';
import { commonNoteName } from '../../../core/music/notes';
import { totals } from '../../../core/practice/stats';
import { AccuracyGrid, AccuracyRow, accuracyCell } from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { CardDescription, WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { cardFromKey } from '../deck';
import { IdentifySession } from '../identify-session';

const PITCH_CLASSES = Array.from({ length: 12 }, (_, pitchClass) => pitchClass);

function describeCard(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card
    ? {
        title: commonNoteName(card.pitchClass),
        detail: `${stringLabel(card.string)}, ${card.fret === 0 ? 'open' : `fret ${card.fret}`}`,
      }
    : undefined;
}

@Component({
  selector: 'app-identify-stats-page',
  imports: [RouterLink, StatsOverview, SessionHistory, AccuracyGrid, WeakestCards, ResetStats],
  templateUrl: './stats-page.html',
  host: { class: 'page' },
})
export class StatsPage {
  private readonly stats = inject(IdentifySession).run.stats;

  protected readonly describeCard = describeCard;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly notes = PITCH_CLASSES.map((pitchClass) => ({
    id: String(pitchClass),
    label: commonNoteName(pitchClass),
  }));

  /** Accuracy per string and note, over every position of that note on the string. */
  protected readonly grid = computed((): AccuracyRow[] => {
    const stats = this.stats();
    return STRING_NUMBERS.map((string) => ({
      id: String(string),
      label: stringLabel(string),
      cells: PITCH_CLASSES.map((pitchClass) =>
        accuracyCell(
          String(pitchClass),
          totals(stats, (key) => {
            const card = cardFromKey(key);
            return card?.string === string && card.pitchClass === pitchClass;
          }),
        ),
      ),
    }));
  });
}
