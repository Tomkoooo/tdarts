'use server';

import { getServerUser } from '@/lib/getServerUser';
import {
  AdminAuthorizationService,
  ADMIN_CAPABILITIES,
} from '@tdarts/services';
import { evaluateFeatureAccess } from '@/features/flags/lib/featureAccess';

export async function adminProbeFeatureAccessAction(featureName: string, clubId?: string) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: 'Unauthorized' };
  const allowed = await AdminAuthorizationService.hasAdminCapability(
    user._id,
    ADMIN_CAPABILITIES.ADMIN_FEATURE_ACCESS_DEBUG_READ,
  );
  if (!allowed) return { ok: false as const, error: 'Forbidden' };

  const result = await evaluateFeatureAccess({
    featureName,
    clubId: clubId?.trim() || undefined,
  });

  return { ok: true as const, result };
}
