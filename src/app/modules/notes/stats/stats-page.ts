import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { COMMON_NOTE_NAMES, displayNoteName, parseNote } from '../../../core/music/notes';
import { totals } from '../../../core/practice/stats';
import { AccuracyGrid, AccuracyRow, accuracyCell } from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { CardDescription, WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { cardFromKey } from '../deck';
import { NotesSession } from '../notes-session';
import { STRING_NUMBERS, stringLabel } from '../../../core/fretboard/tuning';

function describeCard(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card
    ? {
        title: displayNoteName(card.note),
        detail: card.string === null ? 'whole neck' : stringLabel(card.string),
      }
    : undefined;
}

@Component({
  selector: 'app-notes-stats-page',
  imports: [RouterLink, StatsOverview, SessionHistory, AccuracyGrid, WeakestCards, ResetStats],
  templateUrl: './stats-page.html',
  host: { class: 'page' },
})
export class StatsPage {
  private readonly stats = inject(NotesSession).run.stats;

  protected readonly describeCard = describeCard;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly notes = COMMON_NOTE_NAMES.map((name) => ({
    id: name,
    label: displayNoteName(parseNote(name)),
  }));

  /** Accuracy per string and note, plus a whole-neck row once you've practised that. */
  protected readonly grid = computed((): AccuracyRow[] => {
    const stats = this.stats();
    const row = (where: string, label: string, title?: string): AccuracyRow => ({
      id: where,
      label,
      title,
      cells: COMMON_NOTE_NAMES.map((name) =>
        accuracyCell(
          name,
          totals(stats, (key) => key === `${name}|${where}`),
        ),
      ),
    });
    const rows = STRING_NUMBERS.map((string) => row(String(string), stringLabel(string)));
    const practisedNeck = Object.keys(stats).some((key) => key.endsWith('|neck'));
    return practisedNeck ? [...rows, row('neck', 'whole neck')] : rows;
  });
}
