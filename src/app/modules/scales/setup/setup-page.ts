import { Component, inject } from '@angular/core';
import { SCALE_TYPES, ScaleFamily } from '../../../core/music/scales';
import { ChipOption, ChipToggles } from '../../../core/ui/setup/chip-toggles';
import { Choice, SegmentedChoice } from '../../../core/ui/setup/segmented-choice';
import { SetupStart } from '../../../core/ui/setup/setup-start';
import { ScalesSession } from '../scales-session';
import { MAX_FRET_CHOICES, ScalesSettings } from '../settings';

function scaleChips(family: ScaleFamily): ChipOption<string>[] {
  return SCALE_TYPES.filter((scale) => scale.family === family).map((scale) => ({
    value: scale.id,
    label: scale.name,
  }));
}

@Component({
  selector: 'app-scales-setup-page',
  imports: [ChipToggles, SegmentedChoice, SetupStart],
  templateUrl: './setup-page.html',
  host: { class: 'page' },
})
export class SetupPage {
  private readonly session = inject(ScalesSession);
  protected readonly settings = this.session.settings;

  protected readonly majorMinorChips = scaleChips('major-minor');
  protected readonly pentatonicChips = scaleChips('pentatonic');
  protected readonly modeChips = scaleChips('mode');

  protected readonly fretChoices: Choice<number>[] = MAX_FRET_CHOICES.map((maxFret) => ({
    value: maxFret,
    label: `0–${maxFret}`,
    hint:
      maxFret === 12
        ? 'Positions up to the 12th fret.'
        : 'Adds positions higher up the neck for some roots.',
  }));

  protected update(changes: Partial<ScalesSettings>): void {
    this.session.updateSettings(changes);
  }
}
