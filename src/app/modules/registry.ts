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
  {
    path: 'identify',
    title: 'Identify notes',
    description: 'A dot on the neck: name the note, from four choices or all twelve.',
    loadRoutes: () => import('./identify/identify.routes').then((m) => m.IDENTIFY_ROUTES),
  },
  {
    path: 'scales',
    title: 'Identify scales',
    description: 'A scale in one hand position, root marked: major, minor, pentatonics or modes?',
    loadRoutes: () => import('./scales/scales.routes').then((m) => m.SCALES_ROUTES),
  },
  {
    path: 'intervals',
    title: 'Intervals in a scale',
    description: 'Find or name the ♭3, 5 or ♭7 in a scale shape, around its root.',
    loadRoutes: () => import('./intervals/intervals.routes').then((m) => m.INTERVALS_ROUTES),
  },
  {
    path: 'rhythm',
    title: 'Play along',
    description:
      'Strum with the metronome, quarters to sixteenths: see how early or late each hit is.',
    loadRoutes: () => import('./rhythm/rhythm.routes').then((m) => m.RHYTHM_ROUTES),
  },
];
