import { Component, computed, inject } from '@angular/core';
import { CIRCLE_DIRECTIONS, CircleDirection } from '../../../core/music/circle';
import { displayNoteName, parseNote } from '../../../core/music/notes';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { InputPicker } from '../../../core/ui/setup/input-picker';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { CircleSession } from '../circle-session';
import { KEY_QUESTION_LABELS } from '../deck';
import {
  CIRCLE_NOTE_NAMES,
  CircleExercise,
  CircleMicMode,
  CircleOrder,
  CircleSettings,
  KEY_QUESTIONS,
  KeyQuestion,
  STEP_CHOICES,
} from '../settings';

const DIRECTION_CHIP_LABELS: Readonly<Record<CircleDirection, string>> = {
  fourths: 'Fourths (C → F)',
  fifths: 'Fifths (C → G)',
};

@Component({
  selector: 'app-circle-setup-page',
  imports: [ChipToggles, InputPicker, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(CircleSession);
  protected readonly settings = this.session.settings;

  protected readonly exerciseChoices: Choice<CircleExercise>[] = [
    { value: 'next', label: 'Next note', hint: 'What comes after E♭ in fourths? A♭.' },
    {
      value: 'keys',
      label: 'Keys',
      hint: 'Key signatures and relative minors: how many flats in A♭ major?',
    },
    {
      value: 'neck',
      label: 'On the neck',
      hint: 'A note on the fretboard: find the next one round, usually the same fret on the next string.',
    },
  ];

  protected readonly directionChips: ChipOption<CircleDirection>[] = CIRCLE_DIRECTIONS.map(
    (direction) => ({ value: direction, label: DIRECTION_CHIP_LABELS[direction] }),
  );

  protected readonly orderChoices: Choice<CircleOrder>[] = [
    { value: 'random', label: 'Random', hint: 'The notes you are slow on come up more often.' },
    {
      value: 'laps',
      label: 'Laps',
      hint: 'Each answer is the next question, twelve to a lap, and the lap is timed.',
    },
  ];

  protected readonly stepChips: ChipOption<number>[] = STEP_CHOICES.map((steps) => ({
    value: steps,
    label: steps === 1 ? '1 step' : `${steps} steps`,
  }));

  protected readonly keyQuestionChips: ChipOption<KeyQuestion>[] = KEY_QUESTIONS.map((kind) => ({
    value: kind,
    label: KEY_QUESTION_LABELS[kind],
  }));

  protected readonly noteChips: ChipOption<string>[] = CIRCLE_NOTE_NAMES.map((name) => ({
    value: name,
    label: displayNoteName(parseNote(name)),
  }));

  protected readonly notesHeading = computed(() => {
    const { exercise, order } = this.settings();
    if (exercise === 'keys') {
      return 'Major keys to ask about';
    }
    return exercise === 'next' && order === 'laps' ? 'Laps start from' : 'Notes to start from';
  });

  protected readonly micChoices = computed((): Choice<CircleMicMode>[] => [
    { value: 'off', label: 'Off', hint: 'Answer by tapping.' },
    {
      value: 'play',
      label: 'Play the note',
      hint:
        this.settings().exercise === 'keys'
          ? "Play the key's root anywhere on the neck. Key signatures are tapped."
          : 'Play it anywhere on the neck, in any octave. Tapping still works.',
    },
  ]);

  protected selectAllNotes(): void {
    this.update({ notes: CIRCLE_NOTE_NAMES });
  }

  protected update(changes: Partial<CircleSettings>): void {
    this.session.updateSettings(changes);
  }
}
