import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { totals } from '../../../core/practice/stats';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { AccuracyGrid, accuracyCell, speedCell } from '../../../core/ui/stats/accuracy-grid';
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
  imports: [
    RouterLink,
    StatsOverview,
    SessionHistory,
    SegmentedChoice,
    AccuracyGrid,
    WeakestCards,
    ResetStats,
  ],
  templateUrl: './stats-page.html',
  host: { class: 'page' },
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

  /** With the microphone every answer is right: speed is what shows progress. */
  protected readonly measure = signal<'time' | 'accuracy'>('time');
  protected readonly measures: Choice<'time' | 'accuracy'>[] = [
    { value: 'time', label: 'Time' },
    { value: 'accuracy', label: 'Accuracy' },
  ];

  /**
   * Recent time or accuracy per root and chord type, for the chord types you selected or have
   * practised. A cell covers every shape the chord was asked in.
   */
  protected readonly grid = computed(() => {
    const stats = this.stats();
    const byTime = this.measure() === 'time';
    const selected = this.session.settings().qualities;
    const practised = (id: string) => Object.keys(stats).some((key) => key.split('|')[1] === id);
    return CHORD_QUALITIES.filter(
      (quality) => selected.includes(quality.id) || practised(quality.id),
    ).map((quality) => ({
      id: quality.id,
      label: quality.symbol || 'major',
      title: quality.name,
      cells: ROOTS.map((root) => {
        const isCell = (key: string) => isChordKey(key, `${root}|${quality.id}`);
        return byTime
          ? speedCell(
              root,
              Object.entries(stats).flatMap(([key, card]) => (isCell(key) ? [card] : [])),
            )
          : accuracyCell(root, totals(stats, isCell));
      }),
    }));
  });
}
