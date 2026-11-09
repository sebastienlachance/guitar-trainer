import { Component, computed, inject, input } from '@angular/core';
import { Drill } from '../../practice/drill';
import { PracticeLog } from '../../practice/practice-log';
import { Usual, slowestCards, usualAnswerMs, usualGroupMs } from '../../practice/session-compare';
import { SessionRecord, averageAnswerMs, formatDuration } from '../../practice/session-log';
import { accuracyBand, speedBand } from '../../practice/stats';
import { Icon } from '../icon';
import { capitalize, formatSeconds, percentCorrect } from '../text';

/** Cards in "Slowest this time". */
const SLOWEST_SHOWN = 3;

/** "0.4 s faster than your last 5 sessions", and whether that's good news. */
function comparison(eachMs: number, usual: Usual) {
  const tenths = Math.round((eachMs - usual.averageMs) / 100);
  const than = usual.sessions === 1 ? 'your last session' : `your last ${usual.sessions} sessions`;
  if (tenths === 0) {
    return { text: `The same as ${than}`, trend: 'same' };
  }
  const by = (Math.abs(tenths) / 10).toFixed(1);
  return tenths < 0
    ? { text: `${by} s faster than ${than}`, trend: 'faster' }
    : { text: `${by} s slower than ${than}`, trend: 'slower' };
}

/**
 * What a finished session comes to: the time per answer against your usual, the counts, and,
 * where the module offers them, its groups (such as string sets) and its slowest cards.
 */
@Component({
  selector: 'app-session-summary',
  imports: [Icon],
  template: `
    @if (record().answered > 0) {
      <p class="saved"><app-icon name="check" /> Session saved</p>
      <h1>Nice work</h1>
      <div class="tags">
        @for (tag of drill.tags(); track tag) {
          <span class="tag">{{ tag }}</span>
        }
      </div>

      @if (speed(); as speed) {
        <p class="each">{{ speed.each }}</p>
        <p class="muted per">per {{ drill.unit }}</p>
        @if (speed.comparison; as comparison) {
          <p class="comparison" [class]="comparison.trend">
            {{ comparison.text }}
            @if (where()) {
              {{ ' ' }}<span class="where">{{ where() }}</span>
            }
          </p>
        }
      }

      <div class="metrics">
        <div class="metric">
          <span class="muted">Time</span><strong>{{ duration() }}</strong>
        </div>
        <div class="metric">
          <span class="muted">{{ unitLabel }}</span
          ><strong>{{ record().answered }}</strong>
        </div>
        @if (correct(); as correct) {
          <div class="metric">
            <span class="muted">Correct</span
            ><strong [class]="correct.band">{{ correct.text }}</strong>
          </div>
        }
      </div>

      @if (groups(); as groups) {
        <h2>By {{ groups.name }}</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">{{ groups.heading }}</th>
              <th scope="col">{{ unitLabel }}</th>
              <th scope="col">Each</th>
              <th scope="col">Usually</th>
            </tr>
          </thead>
          <tbody>
            @for (row of groups.rows; track row.key) {
              <tr>
                <td>{{ row.key }}</td>
                <td>{{ row.answered }}</td>
                <td [class]="row.band">{{ row.each }}</td>
                <td class="muted">{{ row.usually }}</td>
              </tr>
            }
          </tbody>
        </table>
      }

      @if (slowest().length > 0) {
        <h2>Slowest this time</h2>
        <ul>
          @for (card of slowest(); track card.key) {
            <li>
              <span
                >{{ card.title }}
                @if (card.detail) {
                  <span class="detail muted">{{ card.detail }}</span>
                }
              </span>
              {{ ' ' }}<span [class]="card.band">{{ card.time }}</span>
            </li>
          }
        </ul>
      }
    } @else {
      <h1>Session ended</h1>
      <p class="muted">No {{ drill.unit }}s were answered, so nothing was logged.</p>
    }
  `,
  styles: `
    .saved {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin: 0;
      color: var(--success);
      font-size: 14px;
    }
    h1 {
      margin: 20px 0 4px;
      font-size: 22px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
      margin-top: 8px;
    }
    .each {
      margin: 20px 0 0;
      font-size: 44px;
      font-weight: 500;
      line-height: 1.1;
      font-variant-numeric: tabular-nums;
    }
    .per {
      margin: 2px 0 0;
      font-size: 14px;
    }
    .comparison {
      margin: 8px 0 0;
      font-size: 14px;
    }
    /* In one piece: a line breaking at a hyphen would read "strings 2-" and "3-4". */
    .where {
      white-space: nowrap;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin: 16px 0 4px;
      text-align: left;
    }
    .metric {
      padding: 10px 14px;
      border-radius: var(--radius);
      background: var(--raised);
      font-size: 12px;
    }
    .metric strong {
      display: block;
      font-size: 22px;
      font-weight: 500;
    }
    h2 {
      margin: 20px 0 4px;
      font-size: 15px;
      text-align: left;
    }
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
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
      text-align: left;
    }
    li {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      padding: 8px 0;
      border-top: 1px solid var(--border);
      font-variant-numeric: tabular-nums;
    }
    .detail {
      display: block;
      font-size: 13px;
    }
    .faster,
    .fast,
    .high {
      color: var(--success);
    }
    .slower,
    .medium,
    .mid {
      color: var(--warning);
    }
    .slow,
    .low {
      color: var(--danger);
    }
    .same {
      color: var(--text-muted);
    }
  `,
})
export class SessionSummary {
  protected readonly drill = inject(Drill);
  private readonly log = inject(PracticeLog);

  readonly record = input.required<SessionRecord>();

  protected readonly unitLabel = capitalize(this.drill.unit + 's');
  protected readonly duration = computed(() => formatDuration(this.record().activeMs));

  /** "on strings 2-3-4": the session's groups, which its usual time was measured on. */
  protected readonly where = computed(() => {
    const groups = this.drill.answerGroups;
    const keys = Object.keys(this.record().groups ?? {});
    if (!groups || keys.length === 0) {
      return '';
    }
    const heading = groups.heading.toLowerCase();
    return keys.length === 1 ? `on ${heading} ${keys[0]}` : `on these ${heading}`;
  });

  protected readonly speed = computed(() => {
    const record = this.record();
    const eachMs = averageAnswerMs(record);
    if (eachMs === null) {
      return null;
    }
    const usual = usualAnswerMs(record, this.log.history());
    return {
      each: formatSeconds(eachMs),
      comparison: usual && comparison(eachMs, usual),
    };
  });

  protected readonly correct = computed(() => {
    const { answered, correct } = this.record();
    const allRightByDesign = this.drill.waitsForRightAnswer?.() ?? false;
    return allRightByDesign && correct === answered
      ? null
      : {
          text: percentCorrect(correct, answered),
          band: accuracyBand({ attempts: answered, correct }),
        };
  });

  /** Times per group, when the session spans more than one. */
  protected readonly groups = computed(() => {
    const groups = this.drill.answerGroups;
    const record = this.record();
    const totals = record.groups ?? {};
    if (!groups || Object.keys(totals).length < 2) {
      return null;
    }
    const history = this.log.history();
    return {
      name: groups.name,
      heading: groups.heading,
      rows: groups.keys
        .filter((key) => totals[key])
        .map((key) => {
          const eachMs = totals[key].totalResponseMs / totals[key].answered;
          const usual = usualGroupMs(key, record, history);
          return {
            key,
            answered: totals[key].answered,
            each: formatSeconds(eachMs),
            band: speedBand(eachMs),
            usually: usual ? formatSeconds(usual.averageMs) : '–',
          };
        }),
    };
  });

  protected readonly slowest = computed(() => {
    const describe = this.drill.describeCard;
    if (!describe) {
      return [];
    }
    return slowestCards(this.drill.run.answers(), SLOWEST_SHOWN).flatMap(({ key, averageMs }) => {
      const description = describe(key);
      return description
        ? [
            {
              key,
              ...description,
              time: formatSeconds(averageMs),
              band: speedBand(averageMs),
            },
          ]
        : [];
    });
  });
}
