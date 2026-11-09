import { Component, computed, inject } from '@angular/core';
import { Drill } from '../../practice/drill';
import { PracticeLog } from '../../practice/practice-log';
import { PROGRESS_SESSIONS, groupProgress } from '../../practice/session-compare';
import { speedBand } from '../../practice/stats';
import { formatSeconds } from '../text';

/**
 * Time per answer in each group the module sorts answers into (triads: string sets), at first and
 * lately, so you can see which groups need work. Content inside explains which sessions count.
 */
@Component({
  selector: 'app-group-progress',
  template: `
    @if (groups && rows().length > 0) {
      <section class="panel" aria-labelledby="group-progress-title">
        <h2 id="group-progress-title">By {{ groups.name }}</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">{{ groups.heading }}</th>
              <th scope="col">Sessions</th>
              <th scope="col">At first</th>
              <th scope="col">Lately</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.key) {
              <tr>
                <td>{{ row.key }}</td>
                <td>{{ row.sessions }}</td>
                <td class="muted">{{ row.first }}</td>
                <td [class]="row.band">{{ row.lately }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="hint">
          Seconds per {{ unit }}: your first {{ window }} sessions on those
          {{ groups.heading.toLowerCase() }}, and your last {{ window }}. <ng-content />
        </p>
      </section>
    }
  `,
  styles: `
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      text-align: left;
      font-variant-numeric: tabular-nums;
    }
    th,
    td {
      padding: 8px 8px 8px 0;
      border-top: 1px solid var(--border);
    }
    th {
      border-top: none;
      font-weight: 400;
      color: var(--text-muted);
    }
    .fast {
      color: var(--success);
    }
    .medium {
      color: var(--warning);
    }
    .slow {
      color: var(--danger);
    }
  `,
})
export class GroupProgress {
  private readonly drill = inject(Drill);
  private readonly log = inject(PracticeLog);

  protected readonly groups = this.drill.answerGroups;
  protected readonly unit = this.drill.unit;
  protected readonly window = PROGRESS_SESSIONS;

  protected readonly rows = computed(() =>
    this.groups
      ? groupProgress(this.log.history(), this.drill.run.module, this.groups.keys).map((row) => ({
          key: row.key,
          sessions: row.sessions,
          first: row.firstMs === null ? '–' : formatSeconds(row.firstMs),
          lately: formatSeconds(row.latelyMs),
          band: speedBand(row.latelyMs),
        }))
      : [],
  );
}
