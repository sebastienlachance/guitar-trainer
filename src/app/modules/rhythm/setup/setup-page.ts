import { Component, computed, inject } from '@angular/core';
import { RhythmListener } from '../../../core/audio/rhythm-listener';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { SUBDIVISIONS } from '../deck';
import { RhythmSession } from '../rhythm-session';
import { BAR_CHOICES, ClickMode, RhythmSettings, START_TEMPO_CHOICES } from '../settings';

@Component({
  selector: 'app-rhythm-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  styles: `
    .calibration {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 12px 0;
    }
    .warning {
      color: var(--warning);
    }
  `,
  host: { class: 'page' },
})
export class SetupPage {
  protected readonly session = inject(RhythmSession);
  protected readonly listener = inject(RhythmListener);
  protected readonly settings = this.session.settings;
  protected readonly calibration = this.session.calibration;

  protected readonly subdivisionChips: ChipOption<string>[] = SUBDIVISIONS.map((subdivision) => ({
    value: subdivision.id,
    label: subdivision.name,
    title: subdivision.counting,
  }));

  protected readonly tempoChoices: Choice<number>[] = START_TEMPO_CHOICES.map((bpm) => ({
    value: bpm,
    label: String(bpm),
    hint: 'Where each subdivision starts. A passed take moves it up 4 bpm; two missed takes in a row move it down 4.',
  }));

  protected readonly barChoices: Choice<number>[] = BAR_CHOICES.map((bars) => ({
    value: bars,
    label: `${bars} bars`,
  }));

  protected readonly clickChoices: Choice<ClickMode>[] = [
    {
      value: 'sound',
      label: 'Tick and light',
      hint: 'A high tick the microphone mostly ignores. If it still reaches it, the app warns you.',
    },
    {
      value: 'light',
      label: 'Light only',
      hint: 'Follow the light: nothing for the microphone to hear but your guitar.',
    },
  ];

  protected readonly calibrating = computed(() => {
    const stage = this.calibration().stage;
    return stage === 'count-in' || stage === 'playing';
  });

  /** What calibration is doing or found, and anything to fix. */
  protected readonly calibrationMessage = computed(
    (): { status: string; warning: string | null } => {
      const calibration = this.calibration();
      const latency = this.settings().latencyMs;
      const micError = this.listener.errorMessage();
      switch (calibration.stage) {
        case 'count-in':
          return { status: 'Listen: 1 2 3 4…', warning: null };
        case 'playing':
          return { status: 'Now strike once on each click.', warning: null };
        case 'done':
          return {
            status: `Calibrated: ${latency} ms. Your strikes varied by ${Math.round(calibration.result.spreadMs)} ms.`,
            warning: calibration.leak
              ? 'The tick reached the microphone during the count-in. Lower the volume, use headphones, or choose Light only.'
              : null,
          };
        case 'failed':
          return {
            status: `Heard ${calibration.heard} of 8 strikes.`,
            warning: 'Strike once on each click, a little louder, and try again.',
          };
        default:
          return {
            status: latency === null ? 'Not calibrated yet.' : `Calibrated: ${latency} ms.`,
            warning: micError,
          };
      }
    },
  );

  protected update(changes: Partial<RhythmSettings>): void {
    this.session.updateSettings(changes);
  }
}
