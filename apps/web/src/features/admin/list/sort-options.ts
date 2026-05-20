import type { AdminSortOption } from '@/features/admin/list/AdminListSort';

export const USER_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'updatedAt', label: 'Utolsó módosítás' },
  { value: 'createdAt', label: 'Regisztráció' },
  { value: 'lastLogin', label: 'Utolsó belépés' },
  { value: 'email', label: 'Email' },
  { value: 'name', label: 'Név' },
];

export const CLUB_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'updatedAt', label: 'Frissítve' },
  { value: 'name', label: 'Név' },
  { value: 'tier', label: 'Csomag' },
];

export const PLAYER_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'updatedAt', label: 'Frissítve' },
  { value: 'name', label: 'Név' },
  { value: 'mmr', label: 'MMR' },
];

export const TOURNAMENT_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'updatedAt', label: 'Frissítve' },
  { value: 'name', label: 'Név' },
  { value: 'code', label: 'Kód' },
  { value: 'status', label: 'Státusz' },
];

export const MATCH_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'updated', label: 'Frissítve' },
  { value: 'status', label: 'Státusz' },
  { value: 'round', label: 'Kör' },
  { value: 'tournament', label: 'Verseny' },
];

export const LEAGUE_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'updatedAt', label: 'Frissítve' },
  { value: 'name', label: 'Név' },
];

export const FEEDBACK_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'created', label: 'Létrehozva' },
  { value: 'priority', label: 'Prioritás' },
  { value: 'status', label: 'Státusz' },
];

export const SUBSCRIPTION_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'created', label: 'Feliratkozás' },
  { value: 'user', label: 'Felhasználó' },
  { value: 'club', label: 'Klub' },
];

export const CONTENT_SORT_OPTIONS: AdminSortOption[] = [
  { value: 'expires', label: 'Lejárat' },
  { value: 'title', label: 'Cím' },
];
