import { Component, inject } from '@angular/core';
import { stringLabel } from '../../../core/fretboard/tuning';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { capitalize } from '../../../core/ui/text';
import { BendsSession } from '../bends-session';
import { MIN_START_FRET, sizeName } from '../deck';
import { IN_TUNE_CENTS } from '../judge';
import { BEND_SIZES, BEND_STRINGS, BendsSettings, MAX_FRET_CHOICES, TargetMode } from '../settings';

@Component({
  selector: 'app-bends-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(BendsSession);
  protected readonly settings = this.session.settings;
  protected readonly inTuneCents = IN_TUNE_CENTS;

  protected readonly stringChips: ChipOption<number>[] = BEND_STRINGS.map((string) => ({
    value: string,
    label: stringLabel(string).replace('string ', ''),
  }));

  protected readonly sizeChips: ChipOption<number>[] = BEND_SIZES.map((semitones) => ({
    value: semitones,
    label: capitalize(sizeName(semitones)),
  }));

  protected readonly fretChoices: Choice<number>[] = MAX_FRET_CHOICES.map((maxFret) => ({
    value: maxFret,
    label: `${MIN_START_FRET}–${maxFret}`,
  }));

  protected readonly targetChoices: Choice<TargetMode>[] = [
    {
      value: 'first',
      label: 'Play it first',
      hint: 'The target pitch plays before each bend, to fix it in your ear.',
    },
    { value: 'ask', label: 'On request', hint: 'Press T or the button to hear the target.' },
  ];

  protected update(changes: Partial<BendsSettings>): void {
    this.session.updateSettings(changes);
  }
}
