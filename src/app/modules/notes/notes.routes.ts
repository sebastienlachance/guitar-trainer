import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideNotes } from './notes-session';

export const NOTES_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideNotes(),
    children: [
      {
        path: '',
        title: 'Fretboard notes · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practice fretboard notes · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Fretboard notes stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
