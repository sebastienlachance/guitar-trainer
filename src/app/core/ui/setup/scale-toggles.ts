import { Component, model } from '@angular/core';
import { SCALE_FAMILIES, SCALE_TYPES } from '../../music/scales';
import { ChipToggles } from './chip-toggles';

/** Every scale in the catalog as on/off chips, one group per family, bound to the selected ids. */
@Component({
  selector: 'app-scale-toggles',
  imports: [ChipToggles],
  template: `
    @for (group of groups; track group.id) {
      <app-chip-toggles [label]="group.label" [options]="group.options" [(selected)]="selected" />
    }
  `,
})
export class ScaleToggles {
  /** Scale ids, such as "dorian". */
  readonly selected = model.required<readonly string[]>();

  protected readonly groups = SCALE_FAMILIES.map((family) => ({
    ...family,
    options: SCALE_TYPES.filter((scale) => scale.family === family.id).map((scale) => ({
      value: scale.id,
      label: scale.name,
    })),
  }));
}
