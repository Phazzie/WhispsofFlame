import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('../features/home/home.component').then(m => m.HomeComponent) },
  { path: 's/:sessionId', loadComponent: () => import('../features/session/session.component').then(m => m.SessionComponent) },
  { path: '**', redirectTo: '' }
];
