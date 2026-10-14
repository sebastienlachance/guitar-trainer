import { Component, computed, inject, input } from '@angular/core';
import { Drill } from '../../practice/drill';
import { cardWeight, medianResponseMs, slowness } from '../../practice/scheduler';
import { earlyAverageMs, recentAverageMs } from '../../practice/stats';
import { formatSeconds } from '../text';

export interface CardDescription {
  readonly title: string;
  readonly detail: string;
}

const SHOWN = 8;

/** Correct answers a card needs before "was" compares your first times with your latest ones. */
const SHOW_EARLY_AFTER = 6;

/**
 * The cards that need practice most, missed or slower than your usual, worst first. Ranked by the
 * scheduler's weight, so these are also the cards that come up most.
 */
@Component({
  selector: 'app-weakest-cards',
  template: `
    @if (cards().length === 0) {
      <p class="muted">Practise a few more to see your slowest cards.</p>
    } @else {
      <ul>
        @for (card of cards(); track card.key) {
          <li>
            <span class="title">{{ card.title }}</span
            >{{ ' ' }} <span class="muted">{{ card.detail }}</span
            >{{ ' ' }}
            <span class="score"
              >{{ card.time }}<span class="muted">{{ card.extra }}</span></span
            >
          </li>
        }
      </ul>
    }
  `,
  styles: `
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
      padding: 8px 0;
      border-top: 1px solid var(--border);
      font-size: 14px;
    }
    .title {
      min-width: 64px;
      font-size: 16px;
      font-weight: 500;
    }
    .score {
      margin-left: auto;
    }
  `,
})
export class WeakestCards {
  private readonly stats = inject(Drill).run.stats;

  /** Turns a stats key into words; undefined for keys from cards no longer offered. */
  readonly describe = input.required<(key: string) => CardDescription | undefined>();

  protected readonly cards = computed(() => {
    const stats = this.stats();
    const medianMs = medianResponseMs(stats, Object.keys(stats));
    return Object.entries(stats)
      .filter(([, card]) => card.attempts > card.correct || slowness(card, medianMs) > 0)
      .map(([key, card]) => ({ key, card, weight: cardWeight(stats, key, medianMs) }))
      .sort((a, b) => b.weight - a.weight || recentAverageMs(b.card) - recentAverageMs(a.card))
      .flatMap(({ key, card }) => {
        const description = this.describe()(key);
        if (!description) {
          return [];
        }
        const early = earlyAverageMs(card);
        const extra = [
          early !== null && card.correct >= SHOW_EARLY_AFTER ? `was ${formatSeconds(early)}` : '',
          card.attempts > card.correct ? `${card.correct} of ${card.attempts}` : '',
        ];
        return [
          {
            key,
            ...description,
            time: formatSeconds(recentAverageMs(card)),
            extra: extra
              .filter(Boolean)
              .map((part) => ` · ${part}`)
              .join(''),
          },
        ];
      })
      .slice(0, SHOWN);
  });
}
