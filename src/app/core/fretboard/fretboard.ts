import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { STRING_COUNT, STRING_NAMES } from './tuning';

export interface FretPosition {
  /** String number, 1 = high E. */
  readonly string: number;
  /** 0 = open string. */
  readonly fret: number;
}

/** root: amber; tone: teal; miss: red, for a wrong answer. */
export type DotKind = 'root' | 'tone' | 'miss';

export interface FretboardDot extends FretPosition {
  readonly label: string;
  readonly kind: DotKind;
}

/** Range of fret slots to draw. Slot n is the space just behind fret wire n. */
export interface FretWindow {
  readonly first: number;
  readonly last: number;
}

const MIN_SLOTS = 5;

/** A window with a fret of margin around the fretted notes, starting at the nut when close to it. */
export function fretWindowFor(frets: readonly number[]): FretWindow {
  const fretted = frets.filter((fret) => fret > 0);
  if (fretted.length === 0) {
    return { first: 1, last: MIN_SLOTS };
  }
  const lowest = Math.min(...fretted);
  const first = lowest <= 2 ? 1 : lowest - 1;
  return { first, last: Math.max(first + MIN_SLOTS - 1, Math.max(...fretted) + 1) };
}

const LEFT = 46;
const SLOT_WIDTH = 64;
const TOP = 18;
const STRING_GAP = 22;
const OPEN_X = 30;
const OPEN_WIDTH = 28;
const SINGLE_INLAYS = [3, 5, 7, 9, 15, 17];

/**
 * A fretboard diagram. With `selectable`, it also takes answers: click or tap a position, or
 * focus it, move the cursor with the arrow keys and press Enter or Space.
 */
@Component({
  selector: 'app-fretboard',
  templateUrl: './fretboard.html',
  styleUrl: './fretboard.css',
})
export class Fretboard {
  readonly dots = input.required<readonly FretboardDot[]>();
  /** Spoken description of the diagram for screen readers. */
  readonly description = input.required<string>();
  /** Frets to show; defaults to a window around the dots. */
  readonly window = input<FretWindow>();
  /** Lets you pick positions, reported through `picked`. */
  readonly selectable = input(false);
  /**
   * Where the keyboard cursor starts, e.g. on the string a question is about. Pass a new object
   * for each question: the cursor jumps back here whenever it changes.
   */
  readonly cursorStart = input<FretPosition | null>(null);
  /** Marks the fretboard for the practice frame to focus when a new prompt appears. */
  readonly takesFocus = input(false);

  readonly picked = output<FretPosition>();

  protected readonly top = TOP;
  protected readonly left = LEFT;
  protected readonly bottom = TOP + (STRING_COUNT - 1) * STRING_GAP;
  protected readonly stringGap = STRING_GAP;

  protected readonly range = computed(
    () => this.window() ?? fretWindowFor(this.dots().map((dot) => dot.fret)),
  );
  protected readonly slots = computed(() => {
    const { first, last } = this.range();
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  });
  protected readonly width = computed(() => LEFT + this.slots().length * SLOT_WIDTH + 12);
  protected readonly showsNut = computed(() => this.range().first === 1);

  protected readonly strings = Array.from({ length: STRING_COUNT }, (_, index) => ({
    number: index + 1,
    name: STRING_NAMES[index],
    y: TOP + index * STRING_GAP,
    // Lower strings are thicker.
    thickness: 1 + index * 0.3,
  }));

  protected readonly fretLines = computed(() =>
    Array.from({ length: this.slots().length + 1 }, (_, index) => LEFT + index * SLOT_WIDTH),
  );

  protected readonly inlays = computed(() => {
    const middle = TOP + 2.5 * STRING_GAP;
    return this.slots().flatMap((fret) => {
      const x = this.slotCenter(fret);
      if (fret === 12) {
        return [
          { x, y: TOP + 1.5 * STRING_GAP },
          { x, y: TOP + 3.5 * STRING_GAP },
        ];
      }
      return SINGLE_INLAYS.includes(fret) ? [{ x, y: middle }] : [];
    });
  });

  protected readonly visibleDots = computed(() =>
    this.dots()
      .filter((dot) => this.isVisible(dot.fret))
      .map((dot) => ({ ...dot, x: this.fretX(dot.fret), y: this.stringY(dot.string) })),
  );

  /** One clickable area per string and visible fret, open strings included when the nut shows. */
  protected readonly hitAreas = computed(() => {
    if (!this.selectable()) {
      return [];
    }
    const frets = this.showsNut() ? [0, ...this.slots()] : this.slots();
    return this.strings.flatMap((string) =>
      frets.map((fret) => ({
        string: string.number,
        fret,
        ...this.slotBox(fret),
        y: string.y - STRING_GAP / 2,
      })),
    );
  });

  /** Where the keyboard cursor is: at `cursorStart`, or the middle string at the lowest fret. */
  private readonly cursorPosition = linkedSignal<FretPosition | null>(() => this.cursorStart());
  protected readonly cursor = computed(() => {
    const position = this.cursorPosition() ?? { string: 3, fret: this.lowestFret() };
    const where = position.fret === 0 ? 'open' : `fret ${position.fret}`;
    return {
      ...position,
      ...this.slotBox(position.fret),
      y: this.stringY(position.string) - 10,
      label: `String ${position.string} (${STRING_NAMES[position.string - 1]}), ${where}`,
    };
  });

  protected slotCenter(fret: number): number {
    return LEFT + (fret - this.range().first + 0.5) * SLOT_WIDTH;
  }

  protected choose(position: FretPosition): void {
    const chosen = { string: position.string, fret: position.fret };
    this.cursorPosition.set(chosen);
    this.picked.emit(chosen);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.selectable()) {
      return;
    }
    const { string, fret } = this.cursor();
    const moves: Partial<Record<string, FretPosition>> = {
      ArrowUp: { string: Math.max(1, string - 1), fret },
      ArrowDown: { string: Math.min(STRING_COUNT, string + 1), fret },
      ArrowLeft: { string, fret: Math.max(this.lowestFret(), fret - 1) },
      ArrowRight: { string, fret: Math.min(this.range().last, fret + 1) },
    };
    const move = moves[event.key];
    if (move) {
      this.cursorPosition.set(move);
    } else if (event.key === 'Enter' || event.key === ' ') {
      this.choose({ string, fret });
    } else {
      return;
    }
    // Keeps the page from scrolling, and tells the practice frame the key is taken.
    event.preventDefault();
  }

  private lowestFret(): number {
    return this.showsNut() ? 0 : this.range().first;
  }

  private isVisible(fret: number): boolean {
    const { first, last } = this.range();
    return fret === 0 ? this.showsNut() : fret >= first && fret <= last;
  }

  private fretX(fret: number): number {
    return fret === 0 ? OPEN_X : this.slotCenter(fret);
  }

  private stringY(string: number): number {
    return TOP + (string - 1) * STRING_GAP;
  }

  /** Horizontal extent of a fret's slot, or of the area left of the nut for an open string. */
  private slotBox(fret: number): { x: number; width: number } {
    return fret === 0
      ? { x: OPEN_X - OPEN_WIDTH / 2, width: OPEN_WIDTH }
      : { x: LEFT + (fret - this.range().first) * SLOT_WIDTH, width: SLOT_WIDTH };
  }
}
