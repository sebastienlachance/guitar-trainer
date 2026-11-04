import { Component, computed, inject } from '@angular/core';
import { AudioInputs, BOOSTS } from '../../audio/audio-inputs';
import { HEARD_LEVEL, meterPercent } from '../../audio/level';
import { LevelCheck } from '../../audio/level-check';
import { Choice, SegmentedChoice } from './segmented-choice';

let nextId = 0;

const BOOST_CHOICES: readonly Choice<number>[] = BOOSTS.map((boost) => ({
  value: boost,
  label: boost === 1 ? 'Off' : `×${boost}`,
}));

/**
 * Which sound input to listen to: the default microphone, or another one such as a guitar
 * cable. The choice is remembered for every module, and so is each input's boost. Checking the
 * level shows whether the listeners hear the input loud enough.
 */
@Component({
  selector: 'app-input-picker',
  imports: [SegmentedChoice],
  providers: [LevelCheck],
  template: `
    @if (inputs.named()) {
      <label class="group-label" [for]="selectId">Input</label>
      <select [id]="selectId" (change)="choose($event)">
        <option value="" [selected]="inputs.chosenId() === null">Default microphone</option>
        @for (input of inputs.inputs(); track input.id) {
          <option [value]="input.id" [selected]="input.id === inputs.chosenId()">
            {{ input.label }}
          </option>
        }
      </select>
      @if (inputs.missing()) {
        <p class="warning">
          {{ inputs.chosenLabel() || 'The chosen input' }} isn't connected: using the default
          microphone.
        </p>
      }
    } @else {
      <p class="group-label">Input</p>
      <p class="current">
        The default microphone.{{ ' ' }}
        <button type="button" class="link" (click)="inputs.reveal()">
          Allow the microphone to list the others
        </button>
      </p>
    }

    <app-segmented-choice
      label="Boost"
      [options]="boostChoices"
      [value]="inputs.boost()"
      (valueChange)="inputs.setBoost($event)"
    >
      Turns up a quiet input, such as a guitar cable. Kept for this input.
    </app-segmented-choice>

    <div class="level-heading">
      <p class="group-label">Level</p>
      <button type="button" class="btn" (click)="toggleCheck()">
        {{ checking() ? 'Stop checking' : 'Check the level' }}
      </button>
    </div>
    <div class="meter" aria-hidden="true">
      <span class="fill" [class.heard]="level.heard()" [style.width.%]="levelPercent()"></span>
      <span class="line" [style.left.%]="heardLinePercent"></span>
    </div>
    <p
      class="hint"
      role="status"
      [class.quiet]="levelState() === 'quiet'"
      [class.heard]="levelState() === 'heard'"
      [class.error]="levelState() === 'error'"
    >
      {{ levelText() }}
    </p>

    <p class="hint">
      A guitar cable such as the Rocksmith Real Tone cable works best: no room noise, and nothing
      from the speakers.
    </p>
  `,
  styles: `
    select {
      width: 100%;
      max-width: 420px;
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--control);
    }
    .current {
      margin: 0;
    }
    .warning {
      margin: 8px 0 0;
      color: var(--warning);
    }
    .level-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      max-width: 420px;
      margin-top: 12px;
    }
    .level-heading .group-label {
      margin: 0;
    }
    .meter {
      position: relative;
      max-width: 420px;
      height: 12px;
      margin-top: 8px;
      border-radius: 6px;
      background: var(--control);
      overflow: hidden;
    }
    .fill {
      position: absolute;
      inset: 0 auto 0 0;
      background: var(--text-muted);
    }
    .fill.heard {
      background: var(--success);
    }
    .line {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      margin-left: -1px;
      background: var(--text);
    }
    .hint.quiet {
      color: var(--warning);
    }
    .hint.heard {
      color: var(--success);
    }
    .hint.error {
      color: var(--danger);
    }
  `,
})
export class InputPicker {
  protected readonly inputs = inject(AudioInputs);
  protected readonly level = inject(LevelCheck);
  protected readonly selectId = `input-picker-${nextId++}`;
  protected readonly boostChoices = BOOST_CHOICES;
  /** The line on the meter: what a note must reach for the listeners to hear it. */
  protected readonly heardLinePercent = meterPercent(HEARD_LEVEL);

  protected readonly checking = computed(() => {
    const status = this.level.status();
    return status === 'starting' || status === 'checking';
  });

  protected readonly levelPercent = computed(() => meterPercent(this.level.level()));

  protected readonly levelState = computed(() => {
    switch (this.level.status()) {
      case 'checking':
        return this.level.heard() ? 'heard' : 'quiet';
      case 'error':
        return 'error';
      default:
        return null;
    }
  });

  protected readonly levelText = computed(() => {
    switch (this.level.status()) {
      case 'off':
        return 'Check the level to see what the app hears from this input.';
      case 'starting':
        return 'Starting the microphone…';
      case 'error':
        return this.level.errorMessage();
      case 'checking':
        return this.level.heard()
          ? 'Heard: notes from this input reach the app.'
          : 'Too quiet: pluck a string. If the bar stays left of the line, raise the boost.';
    }
  });

  protected choose(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.inputs.choose(this.inputs.inputs().find((input) => input.id === id) ?? null);
    if (this.checking()) {
      // Check the input chosen now.
      void this.level.start();
    }
  }

  protected toggleCheck(): void {
    if (this.checking()) {
      this.level.stop();
    } else {
      void this.level.start();
    }
  }
}
