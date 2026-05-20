/**
 * Schema-driven admin forms — extend per entity.
 */

export type FieldSpec =
  | { kind: 'string'; key: string; label: string; maxLength?: number }
  | { kind: 'email'; key: string; label: string; maxLength?: number }
  | { kind: 'number'; key: string; label: string }
  | { kind: 'textarea'; key: string; label: string; maxLength?: number; rows?: number }
  | { kind: 'boolean'; key: string; label: string }
  | { kind: 'enum'; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: 'date'; key: string; label: string }
  | { kind: 'readonly'; key: string; label: string }
  | {
      kind: 'relation';
      key: string;
      label: string;
      searchKind: 'user' | 'player' | 'tournament' | 'club';
      displayLabel?: string;
    }
  | { kind: 'honors'; key: string; label: string };

export const USER_PROFILE_FIELDS: FieldSpec[] = [
  { kind: 'string', key: 'name', label: 'Név', maxLength: 120 },
  { kind: 'string', key: 'username', label: 'Felhasználónév', maxLength: 64 },
  { kind: 'email', key: 'email', label: 'Email' },
  { kind: 'string', key: 'locale', label: 'Locale', maxLength: 10 },
  { kind: 'string', key: 'country', label: 'Ország', maxLength: 4 },
];

export const USER_FLAG_FIELDS: FieldSpec[] = [
  { kind: 'boolean', key: 'isAdmin', label: 'Szuper admin' },
  { kind: 'boolean', key: 'isVerified', label: 'Email megerősítve' },
  { kind: 'boolean', key: 'isDeleted', label: 'Törölt fiók' },
  { kind: 'string', key: 'adminRoles', label: 'Admin szerepkörök (vesszővel)' },
];

export const PLAYER_PROFILE_FIELDS: FieldSpec[] = [
  { kind: 'string', key: 'name', label: 'Név', maxLength: 120 },
  { kind: 'string', key: 'country', label: 'Ország', maxLength: 64 },
  {
    kind: 'enum',
    key: 'type',
    label: 'Típus',
    options: [
      { value: 'individual', label: 'individual' },
      { value: 'pair', label: 'pair' },
      { value: 'team', label: 'team' },
    ],
  },
  { kind: 'boolean', key: 'publicConsent', label: 'Publikus profil' },
  { kind: 'relation', key: 'userRef', label: 'Kapcsolt felhasználó', searchKind: 'user' },
  { kind: 'honors', key: 'honors', label: 'Kitüntetések' },
];

export const CLUB_PROFILE_FIELDS: FieldSpec[] = [
  { kind: 'string', key: 'name', label: 'Klub neve', maxLength: 120 },
  { kind: 'textarea', key: 'description', label: 'Leírás', rows: 3 },
  { kind: 'string', key: 'location', label: 'Hely (szöveg)' },
  { kind: 'string', key: 'country', label: 'Ország', maxLength: 4 },
  { kind: 'textarea', key: 'landingPage.aboutText', label: 'Bemutatkozás (about)', rows: 4 },
];

export const CLUB_FLAG_FIELDS: FieldSpec[] = [
  { kind: 'boolean', key: 'verified', label: 'Verified' },
  { kind: 'boolean', key: 'isActive', label: 'Aktív' },
  {
    kind: 'enum',
    key: 'subscriptionModel',
    label: 'Előfizetési csomag',
    options: [
      { value: 'free', label: 'free' },
      { value: 'basic', label: 'basic' },
      { value: 'pro', label: 'pro' },
      { value: 'enterprise', label: 'enterprise' },
    ],
  },
];

export const TOURNAMENT_FLAG_FIELDS: FieldSpec[] = [
  { kind: 'boolean', key: 'isArchived', label: 'Archivált' },
  { kind: 'boolean', key: 'isSandbox', label: 'Sandbox' },
  { kind: 'boolean', key: 'isDeleted', label: 'Törölt' },
  { kind: 'boolean', key: 'verified', label: 'Verified' },
];

export const TOURNAMENT_SETTINGS_FIELDS: FieldSpec[] = [
  { kind: 'string', key: 'tournamentSettings.name', label: 'Verseny neve', maxLength: 200 },
  {
    kind: 'enum',
    key: 'tournamentSettings.status',
    label: 'Státusz',
    options: [
      { value: 'pending', label: 'pending' },
      { value: 'active', label: 'active' },
      { value: 'finished', label: 'finished' },
      { value: 'cancelled', label: 'cancelled' },
    ],
  },
  { kind: 'relation', key: 'clubId', label: 'Klub', searchKind: 'club' },
];

export const FEEDBACK_FIELDS: FieldSpec[] = [
  { kind: 'string', key: 'title', label: 'Cím', maxLength: 200 },
  {
    kind: 'enum',
    key: 'category',
    label: 'Kategória',
    options: [
      { value: 'bug', label: 'bug' },
      { value: 'feature', label: 'feature' },
      { value: 'improvement', label: 'improvement' },
      { value: 'other', label: 'other' },
    ],
  },
  {
    kind: 'enum',
    key: 'priority',
    label: 'Prioritás',
    options: [
      { value: 'low', label: 'low' },
      { value: 'medium', label: 'medium' },
      { value: 'high', label: 'high' },
      { value: 'critical', label: 'critical' },
    ],
  },
  {
    kind: 'enum',
    key: 'status',
    label: 'Státusz',
    options: [
      { value: 'pending', label: 'pending' },
      { value: 'in-progress', label: 'in-progress' },
      { value: 'resolved', label: 'resolved' },
      { value: 'rejected', label: 'rejected' },
      { value: 'closed', label: 'closed' },
    ],
  },
  { kind: 'email', key: 'email', label: 'Email' },
  { kind: 'textarea', key: 'description', label: 'Leírás', rows: 4 },
];

/** @deprecated use CLUB_FLAG_FIELDS */
export const TOURNAMENT_FLAG_FIELDS_LEGACY = TOURNAMENT_FLAG_FIELDS;
