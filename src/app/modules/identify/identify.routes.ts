import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideIdentify } from './identify-session';

export const IDENTIFY_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideIdentify(),
    children: [
      {
        path: '',
        title: 'Identify notes · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practice identifying notes · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Identify notes stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
