import { Component, computed, inject } from '@angular/core';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { MAX_CHORDS, PRESETS, chordsText, readProgression } from '../deck';
import { ProgressionsSession } from '../progressions-session';
import {
  BEATS_PER_CHORD_CHOICES,
  ClickMode,
  ProgressionsSettings,
  START_TEMPO_CHOICES,
} from '../settings';

@Component({
  selector: 'app-progressions-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  styles: `
    .custom {
      width: 100%;
      max-width: 420px;
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius);
      background: var(--control);
      font-size: 16px;
    }
    .warning {
      margin: 8px 0 0;
      font-size: 14px;
      color: var(--warning);
    }
  `,
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(ProgressionsSession);
  protected readonly settings = this.session.settings;
  protected readonly maxChords = MAX_CHORDS;

  protected readonly presetChips: ChipOption<string>[] = PRESETS.map((card) => ({
    value: card.key,
    label: chordsText(card),
    title: card.name ?? '',
  }));

  /** What's wrong with the progression you typed, if anything. */
  protected readonly customProblem = computed(() => {
    const custom = this.settings().custom;
    return custom.trim() === '' ? null : (readProgression(custom).problem ?? null);
  });

  protected readonly beatsChoices: Choice<number>[] = BEATS_PER_CHORD_CHOICES.map((beats) => ({
    value: beats,
    label: beats === 4 ? 'A bar' : `${beats} beats`,
  }));

  protected readonly tempoChoices: Choice<number>[] = START_TEMPO_CHOICES.map((bpm) => ({
    value: bpm,
    label: String(bpm),
    hint: 'Where each progression starts. A passed take moves it up 4 bpm; two missed takes in a row move it down 4.',
  }));

  protected readonly clickChoices: Choice<ClickMode>[] = [
    { value: 'sound', label: 'Tick and light' },
    { value: 'light', label: 'Light only' },
  ];

  protected setCustom(event: Event): void {
    this.update({ custom: (event.target as HTMLInputElement).value });
  }

  protected update(changes: Partial<ProgressionsSettings>): void {
    this.session.updateSettings(changes);
  }
}
