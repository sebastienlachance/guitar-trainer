import { Component, computed, inject } from '@angular/core';
import { FOUR_STRING_SETS, THREE_STRING_SETS } from '../../../core/fretboard/tuning';
import { chordSymbol } from '../../../core/music/chords';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { inversionName } from '../../../core/music/voicings';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { CHORD_QUALITIES, NATURAL_ROOTS, ROOTS, isFourNote } from '../catalog';
import {
  FourNoteVoicing,
  INVERSIONS,
  MicMode,
  PromptDetail,
  STRUM_THRESHOLD_RANGE,
  TIME_LIMIT_CHOICES,
  TriadSettings,
} from '../settings';
import { TriadsSession } from '../triads-session';

const C = parseNote('C');

function qualityChips(fourNote: boolean): ChipOption<string>[] {
  return CHORD_QUALITIES.filter((quality) => isFourNote(quality) === fourNote).map((quality) => ({
    value: quality.id,
    label: chordSymbol(C, quality),
    title: quality.name,
  }));
}

@Component({
  selector: 'app-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  styleUrl: './setup-page.css',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(TriadsSession);
  protected readonly settings = this.session.settings;

  protected readonly threeNoteChips = qualityChips(false);
  protected readonly fourNoteChips = qualityChips(true);
  protected readonly rootChips: ChipOption<string>[] = ROOTS.map((name) => ({
    value: name,
    label: displayNoteName(parseNote(name)),
  }));
  protected readonly stringSetChips: ChipOption<string>[] = [
    ...THREE_STRING_SETS,
    ...FOUR_STRING_SETS,
  ].map((set) => ({ value: set.id, label: set.id }));
  protected readonly inversionChips: ChipOption<number>[] = INVERSIONS.map((value) => ({
    value,
    label: inversionName(value),
  }));
  protected readonly strumRange = STRUM_THRESHOLD_RANGE;

  protected readonly hasFourNoteChords = computed(() =>
    this.fourNoteChips.some((chip) => this.settings().qualities.includes(chip.value)),
  );

  protected readonly promptChoices: Choice<PromptDetail>[] = [
    { value: 'chord', label: 'Chord only', hint: 'Play it any way you like.' },
    { value: 'shape', label: 'Chord and shape', hint: 'A given inversion on a given string set.' },
  ];

  protected readonly voicingChoices: Choice<FourNoteVoicing>[] = [
    { value: 'drop2', label: 'Drop 2', hint: 'All four notes on four strings.' },
    { value: 'shell', label: 'Shells', hint: 'Three notes, leaving out the 5th.' },
    { value: 'both', label: 'Both', hint: 'A mix of the two.' },
  ];

  protected readonly micChoices: Choice<MicMode>[] = [
    { value: 'off', label: 'Off', hint: 'Reveal the answer and check yourself.' },
    {
      value: 'arpeggio',
      label: 'Arpeggio',
      hint: 'Play the notes one at a time, up or down. The app checks the exact shape.',
    },
    {
      value: 'strum',
      label: 'Strum',
      hint: 'Experimental. Checks the notes but not the shape; works best with a clean tone.',
    },
  ];

  protected readonly timeLimitChoices: Choice<number>[] = TIME_LIMIT_CHOICES.map((seconds) => ({
    value: seconds,
    label: seconds === 0 ? 'Off' : `${seconds} s`,
    hint:
      seconds === 0
        ? 'Take as long as you need.'
        : 'Not heard in time: counts as a miss and shows the answer.',
  }));

  protected selectRoots(which: 'all' | 'naturals'): void {
    this.update({ roots: which === 'all' ? ROOTS : NATURAL_ROOTS });
  }

  protected setStrumThreshold(event: Event): void {
    this.update({ strumThreshold: (event.target as HTMLInputElement).valueAsNumber });
  }

  protected update(changes: Partial<TriadSettings>): void {
    this.session.updateSettings(changes);
  }
}
