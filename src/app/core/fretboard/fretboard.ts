import { Component, computed, input } from '@angular/core';
import { STRING_COUNT, STRING_NAMES } from './tuning';

export interface FretboardDot {
  /** String number, 1 = high E. */
  readonly string: number;
  /** 0 = open string. */
  readonly fret: number;
  readonly label: string;
  readonly isRoot: boolean;
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
const SINGLE_INLAYS = [3, 5, 7, 9, 15, 17];

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

  protected readonly stringGap = STRING_GAP;
  protected readonly top = TOP;
  protected readonly left = LEFT;
  protected readonly openX = OPEN_X;
  protected readonly bottom = TOP + (STRING_COUNT - 1) * STRING_GAP;

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

  protected readonly visibleDots = computed(() => {
    const { first, last } = this.range();
    return this.dots()
      .filter((dot) => (dot.fret === 0 ? this.showsNut() : dot.fret >= first && dot.fret <= last))
      .map((dot) => ({
        ...dot,
        x: dot.fret === 0 ? OPEN_X : this.slotCenter(dot.fret),
        y: TOP + (dot.string - 1) * STRING_GAP,
      }));
  });

  protected slotCenter(fret: number): number {
    return LEFT + (fret - this.range().first + 0.5) * SLOT_WIDTH;
  }
}
