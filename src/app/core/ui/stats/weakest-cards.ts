import { Component, computed, inject, input } from '@angular/core';
import { Drill } from '../../practice/drill';
import { averageResponseMs, smoothedMissRate } from '../../practice/stats';
import { formatSeconds } from '../text';

export interface CardDescription {
  readonly title: string;
  readonly detail: string;
}

const SHOWN = 8;

/** The cards you miss most, worst first. */
@Component({
  selector: 'app-weakest-cards',
  template: `
    @if (cards().length === 0) {
      <p class="muted">Nothing missed so far.</p>
    } @else {
      <ul>
        @for (card of cards(); track card.key) {
          <li>
            <span class="title">{{ card.title }}</span>
            <span class="muted">{{ card.detail }}</span>
            <span class="score">{{ card.score }} · {{ card.seconds }}</span>
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

  protected readonly cards = computed(() =>
    Object.entries(this.stats())
      .filter(([, card]) => card.attempts > card.correct)
      .sort(([, a], [, b]) => smoothedMissRate(b) - smoothedMissRate(a) || b.attempts - a.attempts)
      .flatMap(([key, card]) => {
        const description = this.describe()(key);
        return description
          ? [
              {
                key,
                ...description,
                score: `${card.correct} of ${card.attempts}`,
                seconds: formatSeconds(averageResponseMs(card)),
              },
            ]
          : [];
      })
      .slice(0, SHOWN),
  );
}
