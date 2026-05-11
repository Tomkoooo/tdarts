import mongoose, { Schema, Document } from 'mongoose';

/**
 * Singleton document holding global runtime toggles that used to live in
 * `NEXT_PUBLIC_ENABLE_*` env vars. Toggles take effect immediately because
 * we read them at request time (with a short in-process cache) instead of
 * baking them into the client bundle at build time.
 */

export const SYSTEM_SETTINGS_SINGLETON_ID = 'global' as const;

export type FeatureToggleKey =
  | 'LEAGUES'
  | 'SOCKET'
  | 'LIVE_MATCH_FOLLOWING'
  | 'DETAILED_STATISTICS'
  | 'ADVANCED_STATISTICS'
  | 'OAC_CREATION';

export const FEATURE_TOGGLE_KEYS: FeatureToggleKey[] = [
  'LEAGUES',
  'SOCKET',
  'LIVE_MATCH_FOLLOWING',
  'DETAILED_STATISTICS',
  'ADVANCED_STATISTICS',
  'OAC_CREATION',
];

export type FeatureTogglesMap = Record<FeatureToggleKey, boolean>;

export interface SystemSettingsDocument extends Document {
  _id: string;
  features: FeatureTogglesMap;
  subscriptionPaywallEnabled: boolean;
  superAdminBypassEnabled: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

const featuresSchema = new Schema<FeatureTogglesMap>(
  {
    LEAGUES: { type: Boolean, default: true },
    SOCKET: { type: Boolean, default: true },
    LIVE_MATCH_FOLLOWING: { type: Boolean, default: true },
    DETAILED_STATISTICS: { type: Boolean, default: true },
    ADVANCED_STATISTICS: { type: Boolean, default: true },
    OAC_CREATION: { type: Boolean, default: true },
  },
  { _id: false }
);

const systemSettingsSchema = new Schema<SystemSettingsDocument>(
  {
    _id: { type: String, default: SYSTEM_SETTINGS_SINGLETON_ID },
    features: { type: featuresSchema, default: () => ({}) },
    subscriptionPaywallEnabled: { type: Boolean, default: false },
    superAdminBypassEnabled: { type: Boolean, default: true },
    updatedBy: { type: String, default: null },
  },
  { collection: 'system_settings', timestamps: { createdAt: false, updatedAt: true } }
);

export const SystemSettingsModel =
  mongoose.models.SystemSettings ||
  mongoose.model<SystemSettingsDocument>('SystemSettings', systemSettingsSchema);
