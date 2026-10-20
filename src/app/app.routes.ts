import { Routes } from '@angular/router';
import { MODULES } from './modules/registry';

export const routes: Routes = [
  {
    path: '',
    title: 'Guitar trainer',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  {
    path: 'tuner',
    title: 'Tuner · Guitar trainer',
    loadComponent: () => import('./tuner/tuner-page').then((m) => m.TunerPage),
  },
  ...MODULES.map((module) => ({ path: module.path, loadChildren: module.loadRoutes })),
  { path: '**', redirectTo: '' },
];
