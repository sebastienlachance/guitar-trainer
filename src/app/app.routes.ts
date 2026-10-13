import { Routes } from '@angular/router';
import { MODULES } from './modules/registry';

export const routes: Routes = [
  {
    path: '',
    title: 'Guitar trainer',
    loadComponent: () => import('./home/home').then((m) => m.Home),
  },
  ...MODULES.map((module) => ({ path: module.path, loadChildren: module.loadRoutes })),
  { path: '**', redirectTo: '' },
];
