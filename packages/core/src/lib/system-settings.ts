import { connectMongo } from './mongoose';
import {
  getSystemSettingsModel,
  SYSTEM_SETTINGS_SINGLETON_ID,
  FEATURE_TOGGLE_KEYS,
  type FeatureToggleKey,
  type FeatureTogglesMap,
} from '../models/system-settings.model';

/**
 * DB-backed runtime toggles. Replaces NEXT_PUBLIC_ENABLE_* / NEXT_PUBLIC_IS_SUBSCRIPTION_ENABLED
 * env vars, which were broken on production because Next.js inlines them at build time.
 *
 * Read path: 30s in-process cache + explicit invalidation on writes.
 */

export type SystemSettingsSnapshot = {
  features: FeatureTogglesMap;
  subscriptionPaywallEnabled: boolean;
  superAdminBypassEnabled: boolean;
  updatedAt: Date;
  updatedBy: string | null;
};

const CACHE_TTL_MS = 30_000;

type CacheState = {
  value: SystemSettingsSnapshot | null;
  expiresAt: number;
  inflight: Promise<SystemSettingsSnapshot> | null;
};

const cache: CacheState = (global as any).__tdartsSystemSettingsCache || {
  value: null,
  expiresAt: 0,
  inflight: null,
};
if (!(global as any).__tdartsSystemSettingsCache) {
  (global as any).__tdartsSystemSettingsCache = cache;
}

export const SYSTEM_SETTINGS_DEFAULTS = {
  features: {
    LEAGUES: true,
    SOCKET: true,
    LIVE_MATCH_FOLLOWING: true,
    DETAILED_STATISTICS: true,
    ADVANCED_STATISTICS: true,
    OAC_CREATION: true,
  } as FeatureTogglesMap,
  subscriptionPaywallEnabled: false,
  superAdminBypassEnabled: true,
} as const;

function ensureCompleteFeatureMap(features: Partial<FeatureTogglesMap> | undefined | null): FeatureTogglesMap {
  const out: FeatureTogglesMap = { ...SYSTEM_SETTINGS_DEFAULTS.features };
  if (!features) return out;
  for (const key of FEATURE_TOGGLE_KEYS) {
    const value = features[key];
    if (typeof value === 'boolean') {
      out[key] = value;
    }
  }
  return out;
}

function toSnapshot(doc: {
  features?: Partial<FeatureTogglesMap> | null;
  subscriptionPaywallEnabled?: boolean | null;
  superAdminBypassEnabled?: boolean | null;
  updatedAt?: Date | null;
  updatedBy?: string | null;
}): SystemSettingsSnapshot {
  return {
    features: ensureCompleteFeatureMap(doc.features ?? undefined),
    subscriptionPaywallEnabled:
      typeof doc.subscriptionPaywallEnabled === 'boolean'
        ? doc.subscriptionPaywallEnabled
        : SYSTEM_SETTINGS_DEFAULTS.subscriptionPaywallEnabled,
    superAdminBypassEnabled:
      typeof doc.superAdminBypassEnabled === 'boolean'
        ? doc.superAdminBypassEnabled
        : SYSTEM_SETTINGS_DEFAULTS.superAdminBypassEnabled,
    updatedAt: doc.updatedAt ?? new Date(0),
    updatedBy: doc.updatedBy ?? null,
  };
}

async function loadSettingsFromDb(): Promise<SystemSettingsSnapshot> {
  await connectMongo();

  const SystemSettingsModel = getSystemSettingsModel();
  const existing = await SystemSettingsModel.findById(SYSTEM_SETTINGS_SINGLETON_ID).lean();
  if (existing) {
    return toSnapshot(existing as any);
  }

  const seeded = await SystemSettingsModel.findOneAndUpdate(
    { _id: SYSTEM_SETTINGS_SINGLETON_ID },
    {
      $setOnInsert: {
        _id: SYSTEM_SETTINGS_SINGLETON_ID,
        features: { ...SYSTEM_SETTINGS_DEFAULTS.features },
        subscriptionPaywallEnabled: SYSTEM_SETTINGS_DEFAULTS.subscriptionPaywallEnabled,
        superAdminBypassEnabled: SYSTEM_SETTINGS_DEFAULTS.superAdminBypassEnabled,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return toSnapshot(seeded as any);
}

/** Returns the current system settings, with a 30s in-process cache. */
export async function getSystemSettings(): Promise<SystemSettingsSnapshot> {
  const now = Date.now();
  if (cache.value && cache.expiresAt > now) {
    return cache.value;
  }
  if (cache.inflight) {
    return cache.inflight;
  }
  cache.inflight = loadSettingsFromDb()
    .then((snapshot) => {
      cache.value = snapshot;
      cache.expiresAt = Date.now() + CACHE_TTL_MS;
      cache.inflight = null;
      return snapshot;
    })
    .catch((error) => {
      cache.inflight = null;
      throw error;
    });
  return cache.inflight;
}

/** Returns the cached snapshot when available, never falls back to the DB. */
export function peekSystemSettings(): SystemSettingsSnapshot | null {
  if (cache.value && cache.expiresAt > Date.now()) {
    return cache.value;
  }
  return null;
}

/** Forces the next call to re-read from MongoDB. */
export function bustSystemSettingsCache(): void {
  cache.value = null;
  cache.expiresAt = 0;
}

async function applyUpdate(
  update: Record<string, unknown>,
  updatedBy?: string | null
): Promise<SystemSettingsSnapshot> {
  await connectMongo();
  const SystemSettingsModel = getSystemSettingsModel();
  const updated = await SystemSettingsModel.findOneAndUpdate(
    { _id: SYSTEM_SETTINGS_SINGLETON_ID },
    {
      $set: {
        ...update,
        updatedBy: updatedBy ?? null,
      },
      $setOnInsert: {
        _id: SYSTEM_SETTINGS_SINGLETON_ID,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
  bustSystemSettingsCache();
  return toSnapshot(updated as any);
}

export async function updateFeatureToggle(
  key: FeatureToggleKey,
  enabled: boolean,
  updatedBy?: string | null
): Promise<SystemSettingsSnapshot> {
  if (!FEATURE_TOGGLE_KEYS.includes(key)) {
    throw new Error(`Unknown feature toggle key: ${key}`);
  }
  return applyUpdate({ [`features.${key}`]: Boolean(enabled) }, updatedBy);
}

export async function updateSubscriptionPaywallEnabled(
  enabled: boolean,
  updatedBy?: string | null
): Promise<SystemSettingsSnapshot> {
  return applyUpdate({ subscriptionPaywallEnabled: Boolean(enabled) }, updatedBy);
}

export async function updateSuperAdminBypassEnabled(
  enabled: boolean,
  updatedBy?: string | null
): Promise<SystemSettingsSnapshot> {
  return applyUpdate({ superAdminBypassEnabled: Boolean(enabled) }, updatedBy);
}

/** Test-only helper to fully replace the cached snapshot without DB work. */
export function __setSystemSettingsCacheForTests(snapshot: SystemSettingsSnapshot | null): void {
  if (!snapshot) {
    bustSystemSettingsCache();
    return;
  }
  cache.value = snapshot;
  cache.expiresAt = Date.now() + CACHE_TTL_MS;
}

/** Convenience helper used by feature gates that just need the boolean. */
export async function isSubscriptionPaywallEnabled(): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.subscriptionPaywallEnabled;
}

/** Convenience helper for one-off feature toggle reads. */
export async function isGlobalFeatureToggleEnabled(key: FeatureToggleKey): Promise<boolean> {
  const settings = await getSystemSettings();
  return settings.features[key] === true;
}
