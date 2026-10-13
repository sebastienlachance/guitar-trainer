import { LoadChildren } from '@angular/router';

/**
 * A practice module: one kind of exercise, listed on the home screen. To add one, follow
 * docs/adding-a-practice-module.md (copying the `notes` folder is the quickest start), then add
 * an entry to MODULES below.
 */
export interface TrainerModule {
  /** URL segment, e.g. "triads" for #/triads. */
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly loadRoutes: LoadChildren;
}

export const MODULES: readonly TrainerModule[] = [
  {
    path: 'triads',
    title: 'Triads',
    description:
      'Name a chord, play it: triads, sus chords, sixths and sevenths on every string set.',
    loadRoutes: () => import('./triads/triads.routes').then((m) => m.TRIADS_ROUTES),
  },
  {
    path: 'notes',
    title: 'Fretboard notes',
    description: 'Find any note on any string, by tapping the fretboard or playing it.',
    loadRoutes: () => import('./notes/notes.routes').then((m) => m.NOTES_ROUTES),
  },
];
