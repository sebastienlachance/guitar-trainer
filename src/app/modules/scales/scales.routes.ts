import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideScales } from './scales-session';

export const SCALES_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideScales(),
    children: [
      {
        path: '',
        title: 'Identify scales · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practice identifying scales · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Identify scales stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
