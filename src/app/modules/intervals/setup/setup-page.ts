import { Component, inject } from '@angular/core';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { ScaleToggles } from '../../../core/ui/setup/scale-toggles';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { IntervalsSession } from '../intervals-session';
import {
  IntervalTask,
  IntervalsMicMode,
  IntervalsSettings,
  MAX_FRET_CHOICES,
  NeckView,
  ROOT_STRINGS,
} from '../settings';

@Component({
  selector: 'app-intervals-setup-page',
  imports: [ChipToggles, ScaleToggles, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(IntervalsSession);
  protected readonly settings = this.session.settings;

  protected readonly taskChips: ChipOption<IntervalTask>[] = [
    { value: 'find', label: 'Find it', title: 'Find the ♭3: tap it on the neck, or play it' },
    { value: 'name', label: 'Name it', title: 'Which interval is the marked note?' },
  ];

  protected readonly rootStringChips: ChipOption<number>[] = ROOT_STRINGS.map((string) => ({
    value: string,
    label: `String ${string}`,
  }));

  protected readonly neckChoices: Choice<NeckView>[] = [
    {
      value: 'shape',
      label: 'Scale shape',
      hint: 'The other notes of the scale show as faint rings: learn where each interval sits in the shape.',
    },
    {
      value: 'roots',
      label: 'Roots only',
      hint: 'Only the roots show: find the interval from the root alone.',
    },
  ];

  protected readonly fretChoices: Choice<number>[] = MAX_FRET_CHOICES.map((maxFret) => ({
    value: maxFret,
    label: `0–${maxFret}`,
  }));

  protected readonly micChoices: Choice<IntervalsMicMode>[] = [
    { value: 'off', label: 'Off', hint: 'Answer by tapping the fretboard.' },
    {
      value: 'play',
      label: 'Play the note',
      hint: 'Find questions only. Play the interval anywhere in the position; the app hears the pitch, not the string.',
    },
  ];

  protected update(changes: Partial<IntervalsSettings>): void {
    this.session.updateSettings(changes);
  }
}
