import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideBends } from './bends-session';

export const BENDS_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideBends(),
    children: [
      {
        path: '',
        title: 'Bends · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practise bends · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Bends stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
