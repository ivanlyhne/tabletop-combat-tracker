import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  { path: 'campaigns', canActivate: [authGuard], loadComponent: () =>
      import('./features/campaigns/campaign-list/campaign-list.component').then(m => m.CampaignListComponent) },
  { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
];
