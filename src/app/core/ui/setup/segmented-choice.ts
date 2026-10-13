import { Component, computed, input, model } from '@angular/core';

export interface Choice<T> {
  readonly value: T;
  readonly label: string;
  /** Explanation shown under the control while this choice is selected. */
  readonly hint?: string;
}

let nextId = 0;

/**
 * Pick one of a few options, as a row of segments (radio buttons underneath). Content placed
 * inside the element is added after the selected option's hint.
 */
@Component({
  selector: 'app-segmented-choice',
  template: `
    <fieldset>
      <legend [class.visually-hidden]="hideLabel()">{{ label() }}</legend>
      <div class="segmented">
        @for (option of options(); track option.value) {
          <label>
            <input
              type="radio"
              [name]="name"
              [checked]="value() === option.value"
              (change)="value.set(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        }
      </div>
      <p class="hint">{{ hint() }} <ng-content /></p>
    </fieldset>
  `,
  styles: `
    fieldset {
      border: none;
      margin: 12px 0 0;
      padding: 0;
    }
    legend {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }
    .segmented {
      display: inline-flex;
      flex-wrap: wrap;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      overflow: hidden;
    }
    label {
      position: relative;
    }
    input {
      position: absolute;
      opacity: 0;
      inset: 0;
    }
    span {
      display: block;
      padding: 9px 16px;
      font-size: 14px;
      color: var(--text-muted);
      cursor: pointer;
    }
    input:checked + span {
      background: var(--control);
      color: var(--text);
      box-shadow: inset 0 -2px 0 var(--accent);
    }
    input:focus-visible + span {
      outline: 2px solid var(--accent);
      outline-offset: -2px;
    }
  `,
})
export class SegmentedChoice<T> {
  readonly label = input.required<string>();
  /** Keeps the label for screen readers only, when a heading already says it. */
  readonly hideLabel = input(false);
  readonly options = input.required<readonly Choice<T>[]>();
  readonly value = model.required<T>();

  protected readonly name = `choice-${nextId++}`;
  protected readonly hint = computed(
    () => this.options().find((option) => option.value === this.value())?.hint ?? '',
  );
}
