import { Routes } from '@angular/router';
import { ModuleShell } from '../../core/ui/module-shell';
import { provideChanges } from './changes-session';

export const CHANGES_ROUTES: Routes = [
  {
    path: '',
    component: ModuleShell,
    providers: provideChanges(),
    children: [
      {
        path: '',
        title: 'Chord changes · Guitar trainer',
        loadComponent: () => import('./setup/setup-page').then((m) => m.SetupPage),
      },
      {
        path: 'practice',
        title: 'Practise chord changes · Guitar trainer',
        loadComponent: () => import('./practice/practice-page').then((m) => m.PracticePage),
      },
      {
        path: 'stats',
        title: 'Chord changes stats · Guitar trainer',
        loadComponent: () => import('./stats/stats-page').then((m) => m.StatsPage),
      },
    ],
  },
];
