import { Component, inject } from '@angular/core';
import { AudioInputs } from '../../audio/audio-inputs';

let nextId = 0;

/**
 * Which sound input to listen to: the default microphone, or another one such as a guitar
 * cable. The choice is remembered for every module.
 */
@Component({
  selector: 'app-input-picker',
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
  `,
})
export class InputPicker {
  protected readonly inputs = inject(AudioInputs);
  protected readonly selectId = `input-picker-${nextId++}`;

  protected choose(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    this.inputs.choose(this.inputs.inputs().find((input) => input.id === id) ?? null);
  }
}
