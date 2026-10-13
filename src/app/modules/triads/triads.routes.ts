import { Routes } from '@angular/router';
import { TriadsSession } from './triads-session';
import { TriadsShell } from './triads-shell';

export const TRIADS_ROUTES: Routes = [
  {
    path: '',
    component: TriadsShell,
    providers: [TriadsSession],
    children: [
      {
        path: '',
        title: 'Triads · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practice triads · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Triad stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
