import { Component, computed, inject, input } from '@angular/core';
import { MicListener } from '../audio/mic-listener';
import { midiToName } from '../music/notes';
import { Icon } from './icon';

const PITCH_CLASS_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const HEARD_SHOWN = 4;

/** What the microphone is doing: starting, listening (and hearing), or failing to open. */
@Component({
  selector: 'app-mic-status',
  imports: [Icon],
  template: `
    @switch (mic.status()) {
      @case ('starting') {
        <p class="pill">Starting the microphone…</p>
      }
      @case ('listening') {
        <p class="pill listening">
          <app-icon name="mic" />
          @if (heardNotes()) {
            Hearing {{ heardNotes() }}
          } @else {
            Listening: {{ hint() }}
          }
        </p>
        @if (chromaBars(); as bars) {
          <div class="chroma" aria-hidden="true">
            @for (bar of bars; track bar.name) {
              <div class="bar" [class.wanted]="bar.wanted">
                <span class="fill" [style.height.%]="bar.level * 100"></span>
                <span class="name">{{ bar.name }}</span>
              </div>
            }
          </div>
        }
      }
      @case ('error') {
        <p class="pill error" role="alert">
          {{ mic.errorMessage() }}
          <button type="button" class="retry" (click)="mic.retry()">Try again</button>
        </p>
      }
    }
  `,
  styleUrl: './mic-status.css',
})
export class MicStatus {
  protected readonly mic = inject(MicListener);

  /** What to do while nothing is heard yet, e.g. "play the notes one at a time". */
  readonly hint = input.required<string>();
  /** Whether to list the notes heard so far. */
  readonly showHeard = input(true);
  /** Pitch classes to highlight in a live spectrum; null hides the spectrum. */
  readonly spectrumFor = input<readonly number[] | null>(null);

  protected readonly heardNotes = computed(() =>
    this.showHeard() ? this.mic.heard().slice(-HEARD_SHOWN).map(midiToName).join(' ') : '',
  );

  protected readonly chromaBars = computed(() => {
    const wanted = this.spectrumFor();
    if (!wanted) {
      return null;
    }
    const chroma = this.mic.chroma();
    return PITCH_CLASS_NAMES.map((name, pitchClass) => ({
      name,
      level: chroma?.[pitchClass] ?? 0,
      wanted: wanted.includes(pitchClass),
    }));
  });
}
