import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { providePlayback } from './playback-session';

export const PLAYBACK_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: providePlayback(),
    children: [
      {
        path: '',
        title: 'Play it back · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practise playing it back · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Play it back stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
