import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideTriads } from './triads-session';

export const TRIADS_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideTriads(),
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
