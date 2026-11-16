import { Component, inject } from '@angular/core';
import { CircleDirection } from '../../../core/music/circle';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { CircleSession } from '../circle-session';
import { CIRCLE_NOTE_NAMES, CircleMicMode, CircleSettings } from '../settings';

@Component({
  selector: 'app-circle-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(CircleSession);
  protected readonly settings = this.session.settings;

  protected readonly directionChips: ChipOption<CircleDirection>[] = [
    { value: 'fourths', label: 'Fourths (C → F)' },
    { value: 'fifths', label: 'Fifths (C → G)' },
  ];

  protected readonly noteChips: ChipOption<string>[] = CIRCLE_NOTE_NAMES.map((name) => ({
    value: name,
    label: displayNoteName(parseNote(name)),
  }));

  protected readonly micChoices: Choice<CircleMicMode>[] = [
    { value: 'off', label: 'Off', hint: 'Answer by tapping the note name.' },
    {
      value: 'play',
      label: 'Play the note',
      hint: 'Play it anywhere on the neck, in any octave. Tapping still works.',
    },
  ];

  protected selectAllNotes(): void {
    this.update({ notes: CIRCLE_NOTE_NAMES });
  }

  protected update(changes: Partial<CircleSettings>): void {
    this.session.updateSettings(changes);
  }
}
