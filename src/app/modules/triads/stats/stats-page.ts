import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { PracticeLog } from '../../../core/practice/practice-log';
import { formatDuration, formatSessionStart } from '../../../core/practice/session-log';
import {
  accuracy,
  averageResponseMs,
  smoothedMissRate,
  totals,
} from '../../../core/practice/stats';
import { CHORD_QUALITIES, ROOTS } from '../catalog';
import { cardFromKey, cardTitle, shapeLabel } from '../deck';
import { TRIADS_MODULE, TriadsSession } from '../triads-session';

/** Accuracy bands for the grid colours. */
type Band = 'none' | 'low' | 'mid' | 'high';

const WEAKEST_SHOWN = 8;
const SESSIONS_SHOWN = 20;

function bandOf(attempts: number, rate: number): Band {
  if (attempts === 0) {
    return 'none';
  }
  if (rate >= 0.8) {
    return 'high';
  }
  return rate >= 0.5 ? 'mid' : 'low';
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

/** True when a stats key belongs to the chord, whatever shape it was asked in. */
function isChordKey(key: string, chordPrefix: string): boolean {
  return key === chordPrefix || key.startsWith(chordPrefix + '|');
}

@Component({
  selector: 'app-stats-page',
  imports: [RouterLink],
  templateUrl: './stats-page.html',
  styleUrl: './stats-page.css',
})
export class StatsPage {
  private readonly session = inject(TriadsSession);
  private readonly log = inject(PracticeLog);
  private readonly stats = this.session.stats;

  protected readonly confirmingReset = signal(false);
  protected readonly roots = ROOTS.map((name) => ({
    name,
    label: displayNoteName(parseNote(name)),
  }));

  protected readonly overall = computed(() => {
    const stats = this.stats();
    const sum = totals(stats);
    const cards = Object.values(stats);
    const responseMs = cards.reduce((total, card) => total + card.totalResponseMs, 0);
    return {
      attempts: sum.attempts,
      accuracy: sum.attempts > 0 ? percent(accuracy(sum)) : '–',
      cards: cards.length,
      averageSeconds: sum.attempts > 0 ? `${(responseMs / sum.attempts / 1000).toFixed(1)} s` : '–',
    };
  });

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
      name: quality.name,
      cells: ROOTS.map((root) => {
        const sum = totals(stats, (key) => isChordKey(key, `${root}|${quality.id}`));
        const rate = accuracy(sum);
        return {
          root,
          band: bandOf(sum.attempts, rate),
          text: sum.attempts > 0 ? percent(rate) : '–',
          detail: `${sum.correct} of ${sum.attempts}`,
        };
      }),
    }));
  });

  /** Your triads sessions, newest first, with totals over all of them. */
  protected readonly sessions = computed(() => {
    const records = this.log.history().filter((record) => record.module === TRIADS_MODULE);
    const now = Date.now();
    const activeMs = records.reduce((total, record) => total + record.activeMs, 0);
    const chords = records.reduce((total, record) => total + record.answered, 0);
    return {
      count: records.length,
      totals: [
        plural(records.length, 'session'),
        formatDuration(activeMs),
        plural(chords, 'chord'),
      ].join(' · '),
      rows: records.slice(0, SESSIONS_SHOWN).map((record) => {
        const rate = record.correct / record.answered;
        return {
          id: record.id,
          when: formatSessionStart(record.startedAt, now),
          time: formatDuration(record.activeMs),
          chords: record.answered,
          accuracy: percent(rate),
          band: bandOf(record.answered, rate),
        };
      }),
    };
  });

  /** The cards you miss most, worst first. */
  protected readonly weakest = computed(() =>
    Object.entries(this.stats())
      .filter(([, card]) => card.attempts > card.correct)
      .sort(([, a], [, b]) => smoothedMissRate(b) - smoothedMissRate(a) || b.attempts - a.attempts)
      .flatMap(([key, card]) => {
        const triadCard = cardFromKey(key);
        return triadCard
          ? [
              {
                key,
                title: cardTitle(triadCard),
                shape: triadCard.shape ? shapeLabel(triadCard.shape) : 'Any shape',
                score: `${card.correct} of ${card.attempts}`,
                seconds: `${(averageResponseMs(card) / 1000).toFixed(1)} s`,
              },
            ]
          : [];
      })
      .slice(0, WEAKEST_SHOWN),
  );

  protected reset(): void {
    if (this.confirmingReset()) {
      this.session.resetStats();
      this.confirmingReset.set(false);
    } else {
      this.confirmingReset.set(true);
    }
  }
}
