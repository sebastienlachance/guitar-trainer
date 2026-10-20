import { LoadChildren } from '@angular/router';
import { IconName } from '../core/ui/icon';

/** The groups the home screen sorts the modules into, in the order it shows them. */
export const MODULE_GROUPS = [
  { id: 'neck', title: 'Know the neck' },
  { id: 'chords', title: 'Chords' },
  { id: 'rhythm', title: 'Rhythm, ear and technique' },
] as const;

export type ModuleGroup = (typeof MODULE_GROUPS)[number]['id'];

/**
 * A practice module: one kind of exercise, listed on the home screen. To add one, follow
 * docs/adding-a-practice-module.md (copying the `notes` folder is the quickest start), then add
 * an entry to MODULES below.
 */
export interface TrainerModule {
  /** URL segment, e.g. "triads" for #/triads. */
  readonly path: string;
  readonly title: string;
  /** A few words under the title on the home screen's tile. */
  readonly description: string;
  readonly group: ModuleGroup;
  readonly icon: IconName;
  /** Whether it can listen through the microphone, marked on its tile. */
  readonly listens: boolean;
  readonly loadRoutes: LoadChildren;
}

export const MODULES: readonly TrainerModule[] = [
  {
    path: 'triads',
    title: 'Triads',
    description: 'Name it, play it, on every string set',
    group: 'chords',
    icon: 'chord',
    listens: true,
    loadRoutes: () => import('./triads/triads.routes').then((m) => m.TRIADS_ROUTES),
  },
  {
    path: 'notes',
    title: 'Fretboard notes',
    description: 'Find any note: tap it or play it',
    group: 'neck',
    icon: 'neck',
    listens: true,
    loadRoutes: () => import('./notes/notes.routes').then((m) => m.NOTES_ROUTES),
  },
  {
    path: 'identify',
    title: 'Identify notes',
    description: 'Name the note on the neck',
    group: 'neck',
    icon: 'name-note',
    listens: false,
    loadRoutes: () => import('./identify/identify.routes').then((m) => m.IDENTIFY_ROUTES),
  },
  {
    path: 'scales',
    title: 'Identify scales',
    description: 'Name the scale from its shape',
    group: 'neck',
    icon: 'scale-shape',
    listens: false,
    loadRoutes: () => import('./scales/scales.routes').then((m) => m.SCALES_ROUTES),
  },
  {
    path: 'intervals',
    title: 'Intervals in a scale',
    description: 'Find the ♭3, 5 or ♭7 around a root',
    group: 'neck',
    icon: 'interval',
    listens: true,
    loadRoutes: () => import('./intervals/intervals.routes').then((m) => m.INTERVALS_ROUTES),
  },
  {
    path: 'rhythm',
    title: 'Play along',
    description: 'Subdivisions and strumming patterns',
    group: 'rhythm',
    icon: 'metronome',
    listens: true,
    loadRoutes: () => import('./rhythm/rhythm.routes').then((m) => m.RHYTHM_ROUTES),
  },
  {
    path: 'changes',
    title: 'Chord changes',
    description: 'Two chords, one minute',
    group: 'chords',
    icon: 'swap',
    listens: true,
    loadRoutes: () => import('./changes/changes.routes').then((m) => m.CHANGES_ROUTES),
  },
  {
    path: 'playback',
    title: 'Play it back',
    description: 'Hear it, then find it on the neck',
    group: 'rhythm',
    icon: 'ear',
    listens: true,
    loadRoutes: () => import('./playback/playback.routes').then((m) => m.PLAYBACK_ROUTES),
  },
  {
    path: 'bends',
    title: 'Bends',
    description: 'Bend in tune, and hold it',
    group: 'rhythm',
    icon: 'bend',
    listens: true,
    loadRoutes: () => import('./bends/bends.routes').then((m) => m.BENDS_ROUTES),
  },
  {
    path: 'progressions',
    title: 'Progressions',
    description: 'Each chord on its beat',
    group: 'chords',
    icon: 'progression',
    listens: true,
    loadRoutes: () =>
      import('./progressions/progressions.routes').then((m) => m.PROGRESSIONS_ROUTES),
  },
];
