import { Component, computed, inject } from '@angular/core';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { plural } from '../../../core/ui/text';
import { ChangesSession } from '../changes-session';
import { OPEN_CHORDS, lengthText } from '../deck';
import { ChangesSettings, CountMode, LENGTH_CHOICES } from '../settings';

@Component({
  selector: 'app-changes-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(ChangesSession);
  protected readonly settings = this.session.settings;

  protected readonly chordChips: ChipOption<string>[] = OPEN_CHORDS.map((chord) => ({
    value: chord.id,
    label: chord.name,
  }));

  protected readonly pairs = computed(() => {
    const pairs = this.session.deck().length;
    return pairs === 0
      ? ''
      : `${plural(this.settings().chords.length, 'chord')} make ${plural(pairs, 'pair')}.`;
  });

  protected readonly lengthChoices: Choice<number>[] = LENGTH_CHOICES.map((seconds) => ({
    value: seconds,
    label: lengthText(seconds),
  }));

  protected readonly countChoices: Choice<CountMode>[] = [
    {
      value: 'mic',
      label: 'The microphone',
      hint: 'A change counts when a fresh strum sounds like the next chord. Any shape of it counts.',
    },
    {
      value: 'tap',
      label: 'A tap per change',
      hint: 'Press Space or the big button each time you land the next chord.',
    },
  ];

  protected update(changes: Partial<ChangesSettings>): void {
    this.session.updateSettings(changes);
  }
}
