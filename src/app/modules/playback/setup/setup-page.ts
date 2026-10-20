import { Component, inject } from '@angular/core';
import { SCALE_TYPES } from '../../../core/music/scales';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { EAR_INTERVALS } from '../deck';
import { PlaybackSession } from '../playback-session';
import {
  AnswerMode,
  Direction,
  MELODY_LENGTHS,
  MELODY_SCALE_IDS,
  PhraseKind,
  PlaybackSettings,
} from '../settings';

@Component({
  selector: 'app-playback-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(PlaybackSession);
  protected readonly settings = this.session.settings;

  protected readonly kindChips: ChipOption<PhraseKind>[] = [
    { value: 'interval', label: 'Intervals', title: 'Two notes: the first one given' },
    { value: 'melody', label: 'Melodies', title: 'A few notes of a scale, from its root' },
  ];

  protected readonly intervalChips: ChipOption<string>[] = EAR_INTERVALS.map((interval) => ({
    value: interval.id,
    label: interval.id,
    title: interval.name,
  }));

  protected readonly directionChoices: Choice<Direction>[] = [
    { value: 'up', label: 'Up' },
    { value: 'down', label: 'Down' },
    { value: 'both', label: 'Both' },
  ];

  protected readonly scaleChips: ChipOption<string>[] = SCALE_TYPES.filter((scale) =>
    MELODY_SCALE_IDS.includes(scale.id),
  ).map((scale) => ({ value: scale.id, label: scale.name }));

  protected readonly lengthChoices: Choice<number>[] = MELODY_LENGTHS.map((length) => ({
    value: length,
    label: `${length} notes`,
  }));

  protected readonly answerChoices: Choice<AnswerMode>[] = [
    {
      value: 'mic',
      label: 'Play it',
      hint: 'The microphone checks the notes in order, on any string. Reveal shows the answer if you are stuck.',
    },
    {
      value: 'self',
      label: 'Check myself',
      hint: 'Play it, reveal the notes, then say whether you had them.',
    },
  ];

  protected update(changes: Partial<PlaybackSettings>): void {
    this.session.updateSettings(changes);
  }
}
