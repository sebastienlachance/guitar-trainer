import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideProgressions } from './progressions-session';

export const PROGRESSIONS_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideProgressions(),
    children: [
      {
        path: '',
        title: 'Progressions · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practise progressions · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Progressions stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
