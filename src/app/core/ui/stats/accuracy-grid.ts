import { Component, input } from '@angular/core';
import { AccuracyBand, CardStats, accuracyBand } from '../../practice/stats';
import { percentCorrect } from '../text';

export interface AccuracyCell {
  readonly id: string;
  readonly text: string;
  readonly band: AccuracyBand;
  /** Tooltip, e.g. "3 of 4". */
  readonly detail: string;
}

export interface AccuracyRow {
  readonly id: string;
  readonly label: string;
  /** Longer name shown as a tooltip on the row label. */
  readonly title?: string;
  readonly cells: readonly AccuracyCell[];
}

export function accuracyCell(
  id: string,
  sum: Pick<CardStats, 'attempts' | 'correct'>,
): AccuracyCell {
  return {
    id,
    text: percentCorrect(sum.correct, sum.attempts),
    band: accuracyBand(sum),
    detail: `${sum.correct} of ${sum.attempts}`,
  };
}

/** Accuracy table coloured by band, e.g. chord type × root or string × note. */
@Component({
  selector: 'app-accuracy-grid',
  template: `
    <div class="scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">
              <span class="visually-hidden">{{ rowHeader() }}</span>
            </th>
            @for (column of columns(); track column.id) {
              <th scope="col">{{ column.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.id) {
            <tr>
              <th scope="row" [attr.title]="row.title">{{ row.label }}</th>
              @for (cell of row.cells; track cell.id) {
                <td [class]="cell.band" [attr.title]="cell.detail">{{ cell.text }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .scroll {
      overflow-x: auto;
    }
    table {
      border-collapse: separate;
      border-spacing: 3px;
      font-size: 13px;
    }
    th {
      font-weight: 400;
      color: var(--text-muted);
      padding: 4px 6px;
      white-space: nowrap;
    }
    th[scope='row'] {
      text-align: left;
    }
    td {
      min-width: 44px;
      padding: 8px 4px;
      border-radius: 6px;
      text-align: center;
    }
    .none {
      color: var(--text-muted);
      background: var(--raised);
    }
    .low {
      color: var(--danger);
      background: var(--danger-surface);
    }
    .mid {
      color: var(--warning);
      background: #3a2c12;
    }
    .high {
      color: var(--success);
      background: var(--success-surface);
    }
  `,
})
export class AccuracyGrid {
  readonly columns = input.required<readonly { id: string; label: string }[]>();
  readonly rows = input.required<readonly AccuracyRow[]>();
  /** What the rows are, for screen readers, e.g. "Chord type". */
  readonly rowHeader = input.required<string>();
}
