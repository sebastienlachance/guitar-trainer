import { Component, inject } from '@angular/core';
import { STRING_NAMES } from '../../../core/fretboard/tuning';
import {
  COMMON_NOTE_NAMES,
  NATURAL_NOTE_NAMES,
  displayNoteName,
  parseNote,
} from '../../../core/music/notes';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { NotesSession } from '../notes-session';
import {
  ALL_STRINGS,
  MAX_FRET_CHOICES,
  NotesMicMode,
  NotesSettings,
  PromptKind,
} from '../settings';

@Component({
  selector: 'app-notes-setup-page',
  imports: [ChipToggles, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(NotesSession);
  protected readonly settings = this.session.settings;

  protected readonly noteChips: ChipOption<string>[] = COMMON_NOTE_NAMES.map((name) => ({
    value: name,
    label: displayNoteName(parseNote(name)),
  }));

  protected readonly stringChips: ChipOption<number>[] = ALL_STRINGS.map((string) => ({
    value: string,
    label: `${string} (${STRING_NAMES[string - 1]})`,
  }));

  protected readonly promptChoices: Choice<PromptKind>[] = [
    { value: 'string', label: 'One string', hint: 'Find F♯ on string 5: one tap answers.' },
    {
      value: 'neck',
      label: 'Whole neck',
      hint: 'Find every G on the chosen strings, one tap at a time.',
    },
  ];

  protected readonly fretChoices: Choice<number>[] = MAX_FRET_CHOICES.map((maxFret) => ({
    value: maxFret,
    label: `0–${maxFret}`,
  }));

  protected readonly micChoices: Choice<NotesMicMode>[] = [
    { value: 'off', label: 'Off', hint: 'Answer by tapping the fretboard.' },
    {
      value: 'play',
      label: 'Play the note',
      hint: 'One-string prompts only. The app hears the pitch, not the string, so the same note on another string also counts.',
    },
  ];

  protected selectNotes(which: 'all' | 'naturals'): void {
    this.update({ notes: which === 'all' ? COMMON_NOTE_NAMES : NATURAL_NOTE_NAMES });
  }

  protected update(changes: Partial<NotesSettings>): void {
    this.session.updateSettings(changes);
  }
}
