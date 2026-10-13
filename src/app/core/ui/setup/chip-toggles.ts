import { Component, input, model } from '@angular/core';

export interface ChipOption<T> {
  readonly value: T;
  readonly label: string;
  /** Longer name shown as a tooltip. */
  readonly title?: string;
}

let nextId = 0;

/**
 * A group of on/off chips bound to a list of selected values. Values from other groups bound to
 * the same list are left alone, so two groups can share one setting.
 */
@Component({
  selector: 'app-chip-toggles',
  template: `
    <p [id]="labelId" class="group-label" [class.visually-hidden]="hideLabel()">{{ label() }}</p>
    <div class="chips" role="group" [attr.aria-labelledby]="labelId">
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="selected().includes(option.value)"
          [attr.title]="option.title"
          (click)="toggle(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styles: `
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
  `,
})
export class ChipToggles<T> {
  readonly label = input.required<string>();
  /** Keeps the label for screen readers only, when a heading already says it. */
  readonly hideLabel = input(false);
  readonly options = input.required<readonly ChipOption<T>[]>();
  readonly selected = model.required<readonly T[]>();

  protected readonly labelId = `chips-${nextId++}`;

  protected toggle(value: T): void {
    this.selected.update((selected) =>
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );
  }
}
