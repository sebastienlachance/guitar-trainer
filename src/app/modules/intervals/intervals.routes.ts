import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideIntervals } from './intervals-session';

export const INTERVALS_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideIntervals(),
    children: [
      {
        path: '',
        title: 'Intervals in a scale · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practice intervals in a scale · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Intervals in a scale stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
