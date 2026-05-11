'use server';

import { z } from 'zod';
import { AuthorizationService } from '@tdarts/services';
import {
  getSystemSettings,
  updateFeatureToggle,
  updateSubscriptionPaywallEnabled,
  updateSuperAdminBypassEnabled,
  type SystemSettingsSnapshot,
} from '@tdarts/core/system-settings';
import { FEATURE_TOGGLE_KEYS, type FeatureToggleKey } from '@tdarts/core';
import { authorizeUserResult } from '@/shared/lib/guards';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { serializeForClient } from '@/shared/lib/serializeForClient';

type AdminActionResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; data: { success: false; error: string; message: string } };

function success<T>(data: T, status = 200): AdminActionResult<T> {
  return { ok: true, status, data: serializeForClient(data) as T };
}

function failure(message: string, status = 400): AdminActionResult {
  return {
    ok: false,
    status,
    data: { success: false, error: message, message },
  };
}

async function assertGlobalAdmin(): Promise<{ userId: string } | { error: AdminActionResult }> {
  const auth = await authorizeUserResult();
  if (!auth.ok) {
    return { error: failure(auth.message || 'Unauthorized', auth.status || 401) };
  }
  const isAdmin = await AuthorizationService.isGlobalAdmin(auth.data.userId);
  if (!isAdmin) {
    return { error: failure('Admin access required', 403) };
  }
  return { userId: auth.data.userId };
}

const featureToggleKeySchema = z.enum([
  FEATURE_TOGGLE_KEYS[0],
  ...FEATURE_TOGGLE_KEYS.slice(1),
] as [FeatureToggleKey, ...FeatureToggleKey[]]);

const updateFeatureFlagSchema = z.object({
  key: featureToggleKeySchema,
  enabled: z.boolean(),
});

const updateBooleanSchema = z.object({
  enabled: z.boolean(),
});

export type SystemSettingsResult = {
  features: Record<FeatureToggleKey, boolean>;
  subscriptionPaywallEnabled: boolean;
  superAdminBypassEnabled: boolean;
  updatedAt: string;
  updatedBy: string | null;
};

function toResult(snapshot: SystemSettingsSnapshot): SystemSettingsResult {
  return {
    features: { ...snapshot.features },
    subscriptionPaywallEnabled: snapshot.subscriptionPaywallEnabled,
    superAdminBypassEnabled: snapshot.superAdminBypassEnabled,
    updatedAt: snapshot.updatedAt.toISOString(),
    updatedBy: snapshot.updatedBy,
  };
}

export async function adminGetSystemSettingsAction(): Promise<AdminActionResult<SystemSettingsResult>> {
  const guard = await assertGlobalAdmin();
  if ('error' in guard) return guard.error;
  try {
    const snapshot = await getSystemSettings();
    return success(toResult(snapshot));
  } catch (error: any) {
    return failure(error?.message || 'Failed to load system settings', 500);
  }
}

export async function adminUpdateFeatureFlagAction(
  rawInput: { key: FeatureToggleKey; enabled: boolean }
): Promise<AdminActionResult<SystemSettingsResult>> {
  const guard = await assertGlobalAdmin();
  if ('error' in guard) return guard.error;

  const parsed = updateFeatureFlagSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message || 'Invalid payload', 400);
  }

  const action = withTelemetry(
    'admin.systemSettings.updateFeatureFlag',
    async (payload: { key: FeatureToggleKey; enabled: boolean }) => {
      const before = await getSystemSettings();
      const previous = before.features[payload.key];
      const snapshot = await updateFeatureToggle(payload.key, payload.enabled, guard.userId);
      return {
        snapshot,
        previous,
      };
    },
    {
      method: 'ACTION',
      metadata: { feature: 'admin', actionName: 'updateFeatureFlag' },
    }
  );

  try {
    const result = await action(parsed.data);
    return success(toResult(result.snapshot));
  } catch (error: any) {
    return failure(error?.message || 'Failed to update feature flag', 500);
  }
}

export async function adminUpdateSubscriptionPaywallAction(
  rawInput: { enabled: boolean }
): Promise<AdminActionResult<SystemSettingsResult>> {
  const guard = await assertGlobalAdmin();
  if ('error' in guard) return guard.error;

  const parsed = updateBooleanSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message || 'Invalid payload', 400);
  }

  const action = withTelemetry(
    'admin.systemSettings.updatePaywall',
    async (payload: { enabled: boolean }) => {
      return updateSubscriptionPaywallEnabled(payload.enabled, guard.userId);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'admin', actionName: 'updatePaywall' },
    }
  );

  try {
    const snapshot = await action(parsed.data);
    return success(toResult(snapshot));
  } catch (error: any) {
    return failure(error?.message || 'Failed to update paywall toggle', 500);
  }
}

export async function adminUpdateSuperAdminBypassAction(
  rawInput: { enabled: boolean }
): Promise<AdminActionResult<SystemSettingsResult>> {
  const guard = await assertGlobalAdmin();
  if ('error' in guard) return guard.error;

  const parsed = updateBooleanSchema.safeParse(rawInput);
  if (!parsed.success) {
    return failure(parsed.error.issues[0]?.message || 'Invalid payload', 400);
  }

  const action = withTelemetry(
    'admin.systemSettings.updateSuperAdminBypass',
    async (payload: { enabled: boolean }) => {
      return updateSuperAdminBypassEnabled(payload.enabled, guard.userId);
    },
    {
      method: 'ACTION',
      metadata: { feature: 'admin', actionName: 'updateSuperAdminBypass' },
    }
  );

  try {
    const snapshot = await action(parsed.data);
    return success(toResult(snapshot));
  } catch (error: any) {
    return failure(error?.message || 'Failed to update super admin bypass', 500);
  }
}
