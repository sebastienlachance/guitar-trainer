import { Component, computed, inject } from '@angular/core';
import { Drill } from '../../practice/drill';
import { PracticeLog } from '../../practice/practice-log';
import {
  answersPerMinute,
  averageAnswerMs,
  formatDuration,
  formatSessionStart,
} from '../../practice/session-log';
import { accuracyBand } from '../../practice/stats';
import { capitalize, formatSeconds, percentCorrect, plural } from '../text';
import { ProgressChart } from './progress-chart';

const SHOWN = 20;

/** Sessions on the progress chart: enough to see a trend, few enough to tell the points apart. */
const CHARTED = 30;

/** The module's practice sessions: a progress chart, then a table, newest first, with totals. */
@Component({
  selector: 'app-session-history',
  imports: [ProgressChart],
  template: `
    @if (history().count > 0) {
      <section class="panel" aria-labelledby="sessions-title">
        <div class="heading-row">
          <h2 id="sessions-title">Sessions</h2>
          <span class="muted">{{ history().totals }}</span>
        </div>
        <app-progress-chart [records]="history().charted" [unit]="unit" [timed]="timed" />
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Time</th>
                <th scope="col">{{ unitLabel }}</th>
                <th scope="col">Per min</th>
                @if (timed) {
                  <th scope="col">Each</th>
                }
                <th scope="col">Correct</th>
              </tr>
            </thead>
            <tbody>
              @for (row of history().rows; track row.id) {
                <tr>
                  <td>{{ row.when }}</td>
                  <td>{{ row.time }}</td>
                  <td>{{ row.answered }}</td>
                  <td>{{ row.perMinute }}</td>
                  @if (timed) {
                    <td>{{ row.each }}</td>
                  }
                  <td [class]="row.band">{{ row.accuracy }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  styles: `
    .heading-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 4px 12px;
      flex-wrap: wrap;
      font-size: 13px;
    }
    h2 {
      font-size: 17px;
      margin-bottom: 12px;
    }
    .scroll {
      overflow-x: auto;
      margin-top: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      white-space: nowrap;
    }
    th,
    td {
      padding: 8px 8px 8px 0;
      text-align: left;
      border-top: 1px solid var(--border);
    }
    th {
      font-weight: 400;
      color: var(--text-muted);
    }
    .low {
      color: var(--danger);
    }
    .mid {
      color: var(--warning);
    }
    .high {
      color: var(--success);
    }
  `,
})
export class SessionHistory {
  private readonly drill = inject(Drill);
  private readonly log = inject(PracticeLog);

  protected readonly unit = this.drill.unit;
  protected readonly unitLabel = capitalize(this.drill.unit + 's');
  /** Whether answers are timed: a take's time is set by the take, so it says nothing. */
  protected readonly timed = this.drill.run.timesAnswers;

  protected readonly history = computed(() => {
    const module = this.drill.run.module;
    const records = this.log.history().filter((record) => record.module === module);
    const now = Date.now();
    const activeMs = records.reduce((total, record) => total + record.activeMs, 0);
    const answered = records.reduce((total, record) => total + record.answered, 0);
    return {
      count: records.length,
      totals: [
        plural(records.length, 'session'),
        formatDuration(activeMs),
        plural(answered, this.drill.unit),
      ].join(' · '),
      charted: records.slice(0, CHARTED).reverse(),
      rows: records.slice(0, SHOWN).map((record) => {
        const perMinute = answersPerMinute(record);
        const each = averageAnswerMs(record);
        return {
          id: record.id,
          when: formatSessionStart(record.startedAt, now),
          time: formatDuration(record.activeMs),
          answered: record.answered,
          perMinute: perMinute === null ? '–' : perMinute.toFixed(1),
          each: each === null ? '–' : formatSeconds(each),
          accuracy: percentCorrect(record.correct, record.answered),
          band: accuracyBand({ attempts: record.answered, correct: record.correct }),
        };
      }),
    };
  });
}
