import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CIRCLE_DIRECTIONS } from '../../../core/music/circle';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { totals } from '../../../core/practice/stats';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import {
  AccuracyGrid,
  AccuracyRow,
  accuracyCell,
  speedCell,
} from '../../../core/ui/stats/accuracy-grid';
import { ResetStats } from '../../../core/ui/stats/reset-stats';
import { SessionHistory } from '../../../core/ui/stats/session-history';
import { StatsOverview } from '../../../core/ui/stats/stats-overview';
import { WeakestCards } from '../../../core/ui/stats/weakest-cards';
import { capitalize } from '../../../core/ui/text';
import { CircleSession } from '../circle-session';
import { describeCard } from '../deck';
import { CIRCLE_NOTE_NAMES } from '../settings';

@Component({
  selector: 'app-circle-stats-page',
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
  private readonly session = inject(CircleSession);
  private readonly stats = this.session.run.stats;

  protected readonly describeCard = describeCard;
  protected readonly hasAnswers = computed(() => totals(this.stats()).attempts > 0);
  protected readonly notes = CIRCLE_NOTE_NAMES.map((name) => ({
    id: name,
    label: displayNoteName(parseNote(name)),
  }));

  /** Speed shows progress best: with the microphone, a wrong note played isn't a miss. */
  protected readonly measure = signal<'time' | 'accuracy'>('time');
  protected readonly measures: Choice<'time' | 'accuracy'>[] = [
    { value: 'time', label: 'Time' },
    { value: 'accuracy', label: 'Accuracy' },
  ];

  /** Time or accuracy per starting note, for the directions you chose or have practised. */
  protected readonly grid = computed((): AccuracyRow[] => {
    const stats = this.stats();
    const byTime = this.measure() === 'time';
    const selected = this.session.settings().directions;
    const practised = (direction: string) =>
      Object.keys(stats).some((key) => key.startsWith(`${direction}|`));
    return CIRCLE_DIRECTIONS.filter(
      (direction) => selected.includes(direction) || practised(direction),
    ).map((direction) => ({
      id: direction,
      label: capitalize(direction),
      cells: CIRCLE_NOTE_NAMES.map((name) => {
        const key = `${direction}|${name}`;
        return byTime
          ? speedCell(name, stats[key] ? [stats[key]] : [])
          : accuracyCell(
              name,
              totals(stats, (each) => each === key),
            );
      }),
    }));
  });
}
