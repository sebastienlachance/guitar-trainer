import { Component, ElementRef, computed, inject, input, output } from '@angular/core';

export interface AnswerOption<T> {
  readonly value: T;
  readonly label: string;
}

/** What was picked and what was right, once the answer has been checked. */
export interface CheckedAnswer<T> {
  readonly picked: T;
  readonly correct: T;
}

/** Number keys work as shortcuts up to this many options. */
const MAX_SHORTCUTS = 9;

/**
 * Answer by picking one option. Number keys 1–9 pick directly (up to nine options), arrow keys
 * move between options, and Enter or Space picks the focused one. Once `checked` is set, the
 * right option is marked, along with yours if it was wrong.
 */
@Component({
  selector: 'app-choice-buttons',
  template: `
    <div
      class="choices"
      role="group"
      [attr.aria-label]="label()"
      [class.few]="options().length <= 4"
      (keydown)="onArrowKey($event)"
    >
      @for (option of options(); track option.value; let index = $index) {
        <button
          type="button"
          class="choice"
          [class.correct]="isCorrect(option.value)"
          [class.wrong]="isWrongPick(option.value)"
          [attr.aria-disabled]="checked() !== null"
          [attr.data-autofocus]="takesFocus() && index === 0 ? '' : null"
          (click)="choose(option.value)"
        >
          @if (hasShortcuts()) {
            <span class="key" aria-hidden="true">{{ index + 1 }}</span>
          }
          {{ option.label }}
          @if (isCorrect(option.value)) {
            <span class="visually-hidden">(correct answer)</span>
          } @else if (isWrongPick(option.value)) {
            <span class="visually-hidden">(your answer)</span>
          }
        </button>
      }
    </div>
  `,
  styleUrl: './choice-buttons.css',
  host: { '(document:keydown)': 'onShortcut($event)' },
})
export class ChoiceButtons<T> {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** What the options are, for screen readers, e.g. "Note names". */
  readonly label = input.required<string>();
  readonly options = input.required<readonly AnswerOption<T>[]>();
  /** Null while waiting for an answer. */
  readonly checked = input<CheckedAnswer<T> | null>(null);
  /** Marks the first option for the practice frame to focus when a new question appears. */
  readonly takesFocus = input(false);

  readonly chosen = output<T>();

  protected readonly hasShortcuts = computed(() => this.options().length <= MAX_SHORTCUTS);

  protected isCorrect(value: T): boolean {
    return this.checked()?.correct === value;
  }

  protected isWrongPick(value: T): boolean {
    const checked = this.checked();
    return checked !== null && checked.picked === value && checked.correct !== value;
  }

  protected choose(value: T): void {
    if (this.checked() === null) {
      this.chosen.emit(value);
    }
  }

  protected onArrowKey(event: KeyboardEvent): void {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const buttons = [...this.host.nativeElement.querySelectorAll<HTMLButtonElement>('.choice')];
    const current = buttons.indexOf(event.target as HTMLButtonElement);
    if (step === undefined || current < 0) {
      return;
    }
    buttons[(current + step + buttons.length) % buttons.length].focus();
    // Keeps the page from scrolling, and tells the practice frame the key is taken.
    event.preventDefault();
  }

  protected onShortcut(event: KeyboardEvent): void {
    const index = Number(event.key) - 1;
    const inControl =
      event.target instanceof HTMLElement &&
      event.target.closest('input, select, textarea') !== null;
    if (
      !this.hasShortcuts() ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= this.options().length ||
      event.defaultPrevented ||
      inControl ||
      event.repeat ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this.choose(this.options()[index].value);
  }
}
