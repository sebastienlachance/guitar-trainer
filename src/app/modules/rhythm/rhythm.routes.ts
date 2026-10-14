import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideRhythm } from './rhythm-session';

export const RHYTHM_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideRhythm(),
    children: [
      {
        path: '',
        title: 'Play along · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practice playing along · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Play along stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
