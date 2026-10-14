import { Component, computed, inject } from '@angular/core';
import { Drill } from '../../practice/drill';
import { totals } from '../../practice/stats';
import { formatSeconds, percentCorrect } from '../text';

/** Headline numbers for a module: accuracy, answers, cards practised, average time. */
@Component({
  selector: 'app-stats-overview',
  template: `
    <section class="metrics" aria-label="Overall">
      <div class="metric">
        <span class="muted">Accuracy</span>
        <strong>{{ overview().accuracy }}</strong>
      </div>
      <div class="metric">
        <span class="muted">Answers</span>
        <strong>{{ overview().attempts }}</strong>
      </div>
      <div class="metric">
        <span class="muted">Cards practised</span>
        <strong>{{ overview().cards }}</strong>
      </div>
      <div class="metric">
        <span class="muted">Average time</span>
        <strong>{{ overview().averageSeconds }}</strong>
      </div>
    </section>
  `,
  styles: `
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }
    .metric {
      display: flex;
      flex-direction: column;
      padding: 14px 16px;
      border-radius: var(--radius);
      background: var(--surface);
      font-size: 13px;
    }
    .metric strong {
      font-size: 24px;
      font-weight: 500;
    }
  `,
})
export class StatsOverview {
  private readonly stats = inject(Drill).run.stats;

  protected readonly overview = computed(() => {
    const stats = this.stats();
    const sum = totals(stats);
    const cards = Object.values(stats);
    const responseMs = cards.reduce((total, card) => total + card.totalResponseMs, 0);
    return {
      attempts: sum.attempts,
      accuracy: percentCorrect(sum.correct, sum.attempts),
      cards: cards.length,
      averageSeconds: sum.attempts > 0 ? formatSeconds(responseMs / sum.attempts) : '–',
    };
  });
}
