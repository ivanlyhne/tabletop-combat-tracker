import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'campaigns',
    canActivate: [authGuard],
    loadComponent: () => import('./features/campaigns/campaign-list/campaign-list.component').then(m => m.CampaignListComponent),
  },
  {
    path: 'campaigns/:campaignId/characters',
    canActivate: [authGuard],
    loadComponent: () => import('./features/characters/character-list/character-list.component').then(m => m.CharacterListComponent),
  },
  {
    path: 'campaigns/:campaignId/enemies',
    canActivate: [authGuard],
    loadComponent: () => import('./features/enemies/enemy-list/enemy-list.component').then(m => m.EnemyListComponent),
  },
  {
    path: 'campaigns/:campaignId/encounters/new',
    canActivate: [authGuard],
    loadComponent: () => import('./features/encounters/encounter-setup/encounter-setup.component').then(m => m.EncounterSetupComponent),
  },
  {
    path: 'encounters/:encounterId/combat',
    canActivate: [authGuard],
    loadComponent: () => import('./features/combat/combat-view/combat-view.component').then(m => m.CombatViewComponent),
  },
  {
    path: 'settings/ai',
    canActivate: [authGuard],
    loadComponent: () => import('./features/settings/ai-settings/ai-settings.component').then(m => m.AiSettingsComponent),
  },
  {
    path: 'player/:encounterId',
    // No authGuard — public read-only view for players
    loadComponent: () => import('./features/player/player-view.component').then(m => m.PlayerViewComponent),
  },
  { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
];
