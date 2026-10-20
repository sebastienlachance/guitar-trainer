import { Component, computed, input } from '@angular/core';
import { TakeScore } from '../audio/timing';

/** How far from the line a hit's mark can go, as a share of half the strip's height. */
const REACH = 0.9;

interface Mark {
  readonly rest: boolean;
  /** Where the mark sits, as a share of the height; null for a miss or a rest. */
  readonly top: number | null;
  readonly onTime: boolean;
  readonly title: string;
  readonly barStart: boolean;
}

const REST = { rest: true, top: null, onTime: false, title: 'A rest' };

/**
 * A rhythm take at a glance: one mark per hit, left to right. On the line is right on the beat,
 * above is early, below is late; the shaded band is on time. ✕ marks a missed hit, and a dot a
 * rest of a strumming pattern.
 */
@Component({
  selector: 'app-take-strip',
  template: `
    <div class="strip" role="img" [attr.aria-label]="description()">
      <div class="band" [style.height.%]="bandHeight()"></div>
      @for (hit of marks(); track $index) {
        <span class="hit" [class.bar-start]="hit.barStart" [attr.title]="hit.title">
          @if (hit.rest) {
            <span class="rest" aria-hidden="true">·</span>
          } @else if (hit.top === null) {
            <span class="missed" aria-hidden="true">✕</span>
          } @else {
            <span class="mark" [class.off]="!hit.onTime" [style.top.%]="hit.top"></span>
          }
        </span>
      }
    </div>
    <p class="legend muted">
      Above the line: early · below: late · ✕ missed
      @if (slots()) {
        · a dot is a rest
      }
    </p>
  `,
  styles: `
    .strip {
      position: relative;
      display: flex;
      height: 72px;
      border-radius: var(--radius);
      background: var(--raised);
      overflow: hidden;
    }
    .band {
      position: absolute;
      inset: 50% 0 auto;
      transform: translateY(-50%);
      background: var(--success-surface);
    }
    .strip::after {
      content: '';
      position: absolute;
      inset: 50% 0 auto;
      border-top: 1px solid var(--border-strong);
    }
    .hit {
      position: relative;
      flex: 1;
      z-index: 1;
    }
    .bar-start {
      border-left: 1px solid var(--border-strong);
    }
    .mark {
      position: absolute;
      left: 50%;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--success);
      transform: translate(-50%, -50%);
    }
    .mark.off {
      background: var(--warning);
    }
    .rest {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--text-muted);
    }
    .missed {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: var(--danger);
      font-size: 11px;
    }
    .legend {
      margin: 6px 0 0;
      font-size: 12px;
    }
  `,
})
export class TakeStrip {
  readonly score = input.required<TakeScore>();
  /** Hits in a bar, to mark where bars start. */
  readonly perBar = input.required<number>();
  /**
   * For a strumming pattern: the slots of one bar, true where a stroke is played and false for a
   * rest. Rests then show between the hits.
   */
  readonly slots = input<readonly boolean[] | null>(null);
  /** The take in words, for screen readers. */
  readonly description = input.required<string>();

  /** The marks scale so that twice the tolerance reaches the edge. */
  private readonly scaleMs = computed(() => 2 * this.score().toleranceMs);

  protected readonly bandHeight = computed(
    () => (this.score().toleranceMs / this.scaleMs()) * REACH * 100,
  );

  private readonly hitMarks = computed(() =>
    this.score().hits.map((hit, index) => {
      if (hit.offsetMs === null) {
        return { rest: false, top: null, onTime: false, title: `Hit ${index + 1}: missed` };
      }
      const offset = hit.offsetMs;
      const reach = Math.max(-1, Math.min(1, offset / this.scaleMs()));
      const words =
        Math.abs(offset) < 1
          ? 'on the beat'
          : `${Math.round(Math.abs(offset))} ms ${offset > 0 ? 'late' : 'early'}`;
      return {
        rest: false,
        top: 50 + reach * REACH * 50,
        onTime: Math.abs(offset) <= this.score().toleranceMs,
        title: `Hit ${index + 1}: ${words}`,
      };
    }),
  );

  protected readonly marks = computed(() => {
    const hits = this.hitMarks();
    const slots = this.slots();
    if (!slots) {
      return hits.map((hit, index) => ({
        ...hit,
        barStart: index > 0 && index % this.perBar() === 0,
      }));
    }
    const bars = Math.round(hits.length / Math.max(1, slots.filter(Boolean).length));
    const marks: Mark[] = [];
    let next = 0;
    for (let bar = 0; bar < bars; bar++) {
      for (const [slot, struck] of slots.entries()) {
        const barStart = bar > 0 && slot === 0;
        marks.push(struck ? { ...hits[next++], barStart } : { ...REST, barStart });
      }
    }
    return marks;
  });
}
