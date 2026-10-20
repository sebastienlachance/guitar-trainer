import { Component, computed, inject } from '@angular/core';
import { MicStatus } from '../../../core/ui/mic-status';
import { PracticeFrame } from '../../../core/ui/practice-frame/practice-frame';
import { TrendChart, TrendPoint } from '../../../core/ui/stats/trend-chart';
import { COUNT_IN, ChangesSession } from '../changes-session';
import { changesText, perMinute } from '../deck';

/** Takes of the pair on the result's chart. */
const CHARTED = 12;

/** The countdown ring's radius, in its 200 × 200 drawing. */
const RING_RADIUS = 92;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * One-minute changes: press Start (or Space), count 3, then change between the two chords as
 * many times as you can before the ring runs out.
 */
@Component({
  selector: 'app-changes-practice-page',
  imports: [MicStatus, PracticeFrame, TrendChart],
  templateUrl: './practice-page.html',
  styleUrl: './practice-page.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class PracticePage {
  protected readonly session = inject(ChangesSession);
  protected readonly run = this.session.run;
  protected readonly card = this.run.current;
  protected readonly settings = this.session.settings;
  protected readonly countInLength = COUNT_IN;
  protected readonly ringRadius = RING_RADIUS;
  protected readonly ringLength = RING_LENGTH;

  /** The other chord of the pair: the one to change to next. */
  protected readonly next = computed(() => {
    const card = this.card();
    const target = this.session.target();
    if (!card || !target) {
      return null;
    }
    return target.id === card.first.id ? card.second : card.first;
  });

  /** Negative: the dash slides forward, so the time used grows clockwise from the top. */
  protected readonly ringOffset = computed(
    () => -RING_LENGTH * (1 - this.session.remainingMs() / (this.settings().seconds * 1000)),
  );

  protected readonly timeLeft = computed(() => {
    const seconds = Math.ceil(this.session.remainingMs() / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  protected readonly bestText = computed(() => {
    const best = this.session.best();
    return best === null ? 'Your first take of this pair.' : `Your best: ${rate(best)}.`;
  });

  protected readonly resultText = computed(() => {
    const result = this.session.result();
    return result ? changesText(result) : '';
  });

  protected readonly verdict = computed(() => {
    const result = this.session.result();
    if (!result) {
      return '';
    }
    if (result.bestBefore === null) {
      return 'Your first take: the one to beat.';
    }
    const gain = Math.round(result.perMinute - result.bestBefore);
    if (gain > 0) {
      return `New best: ${gain} more a minute than before.`;
    }
    return result.passed ? 'You matched your best.' : `Your best is ${rate(result.bestBefore)}.`;
  });

  protected readonly pace = computed(() => {
    const result = this.session.result();
    return result && result.changes > 0
      ? `${(result.seconds / result.changes).toFixed(1)} s per change`
      : '';
  });

  protected readonly points = computed((): TrendPoint[] => {
    const card = this.card();
    return this.session
      .takes()
      .filter((take) => take.pair === card?.key)
      .slice(-CHARTED)
      .map((take) => ({ id: String(take.at), at: take.at, value: perMinute(take) }));
  });

  protected readonly describePoint = (value: number) => rate(value);

  /** Space starts a take, and in tap mode counts a change; the practice frame doesn't use it here. */
  protected onKeydown(event: KeyboardEvent): void {
    const inControl =
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea') !== null;
    if (
      event.key !== ' ' ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      inControl ||
      this.run.view() !== 'running' ||
      this.run.phase() !== 'prompt'
    ) {
      return;
    }
    if (this.session.stage() === 'idle') {
      this.session.start();
    } else {
      this.session.tap();
    }
    // Also stops Space from clicking the focused button a second time.
    event.preventDefault();
  }
}

/** "34 a minute". */
function rate(perMinute: number): string {
  return `${Math.round(perMinute)} a minute`;
}
