import { Component, inject } from '@angular/core';
import { STRING_NAMES, STRING_NUMBERS } from '../../../core/fretboard/tuning';
import {
  COMMON_NOTE_NAMES,
  NATURAL_NOTE_NAMES,
  displayNoteName,
  parseNote,
} from '../../../core/music/notes';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { IdentifySession } from '../identify-session';
import { ChoiceCount, IdentifySettings, MAX_FRET_CHOICES } from '../settings';

@Component({
  selector: 'app-identify-setup-page',
  imports: [ChipToggles, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(IdentifySession);
  protected readonly settings = this.session.settings;

  protected readonly noteChips: ChipOption<string>[] = COMMON_NOTE_NAMES.map((name) => ({
    value: name,
    label: displayNoteName(parseNote(name)),
  }));

  protected readonly stringChips: ChipOption<number>[] = STRING_NUMBERS.map((string) => ({
    value: string,
    label: `${string} (${STRING_NAMES[string - 1]})`,
  }));

  protected readonly fretChoices: Choice<number>[] = MAX_FRET_CHOICES.map((maxFret) => ({
    value: maxFret,
    label: `0–${maxFret}`,
  }));

  protected readonly answerChoices: Choice<ChoiceCount>[] = [
    { value: 4, label: '4 choices', hint: 'The right name and three others. Keys 1 to 4 answer.' },
    { value: 12, label: 'All 12 names', hint: 'Every note name. Arrow keys and Enter answer.' },
  ];

  protected selectNotes(which: 'all' | 'naturals'): void {
    this.update({ notes: which === 'all' ? COMMON_NOTE_NAMES : NATURAL_NOTE_NAMES });
  }

  protected update(changes: Partial<IdentifySettings>): void {
    this.session.updateSettings(changes);
  }
}
