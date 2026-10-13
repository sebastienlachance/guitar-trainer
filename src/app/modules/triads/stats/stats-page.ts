import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { totals } from '../../../core/practice/stats';
import { AccuracyGrid, accuracyCell } from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { CardDescription, WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { CHORD_QUALITIES, ROOTS } from '../catalog';
import { cardFromKey, cardTitle, shapeLabel } from '../deck';
import { TriadsSession } from '../triads-session';

/** True when a stats key belongs to the chord, whatever shape it was asked in. */
function isChordKey(key: string, chordPrefix: string): boolean {
  return key === chordPrefix || key.startsWith(chordPrefix + '|');
}

function describeCard(key: string): CardDescription | undefined {
  const card = cardFromKey(key);
  return card
    ? { title: cardTitle(card), detail: card.shape ? shapeLabel(card.shape) : 'Any shape' }
    : undefined;
}

@Component({
  selector: 'app-stats-page',
  imports: [RouterLink, StatsOverview, SessionHistory, AccuracyGrid, WeakestCards, ResetStats],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.css',
})
export class StatsPage {
  private readonly session = inject(TriadsSession);
  private readonly stats = this.session.run.stats;

  protected readonly describeCard = describeCard;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly roots = ROOTS.map((name) => ({
    id: name,
    label: displayNoteName(parseNote(name)),
  }));

  /** Accuracy per root and chord type, for the chord types you selected or have practised. */
  protected readonly grid = computed(() => {
    const stats = this.stats();
    const selected = this.session.settings().qualities;
    const practised = (id: string) => Object.keys(stats).some((key) => key.split('|')[1] === id);
    return CHORD_QUALITIES.filter(
      (quality) => selected.includes(quality.id) || practised(quality.id),
    ).map((quality) => ({
      id: quality.id,
      label: quality.symbol || 'major',
      title: quality.name,
      cells: ROOTS.map((root) =>
        accuracyCell(
          root,
          totals(stats, (key) => isChordKey(key, `${root}|${quality.id}`)),
        ),
      ),
    }));
  });
}
