import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideCircle } from './circle-session';

export const CIRCLE_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideCircle(),
    children: [
      {
        path: '',
        title: 'Circle of fifths · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practice the circle of fifths · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Circle of fifths stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
