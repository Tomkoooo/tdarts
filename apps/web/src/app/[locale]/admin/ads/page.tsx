import { AdminAdsManager } from '@/components/admin/ads/AdminAdsManager';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';
import { authorizeUserResult } from '@/shared/lib/guards';
import { AdminAuthorizationService, ADMIN_CAPABILITIES } from '@tdarts/services';
import { redirect } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

export default async function AdminAdsPage({ params }: Props) {
  const { locale } = await params;
  const auth = await authorizeUserResult();
  if (!auth.ok) redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/admin/ads`)}`);
  const allowed = await AdminAuthorizationService.hasAdminCapability(auth.data.userId, ADMIN_CAPABILITIES.ADMIN_ADS_READ);
  if (!allowed) redirect(`/${locale}/profile`);

  const enabled = await FeatureFlagService.isFeatureEnabled('ADS');
  if (!enabled) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h1 className="text-xl font-semibold">Ads module is disabled</h1>
        <p className="text-sm text-muted-foreground">
          Enable the ADS feature flag (NEXT_PUBLIC_ENABLE_ADS=true) to unlock ad management.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ads</h1>
        <p className="text-sm text-muted-foreground">
          Manage campaigns, creatives, audience targeting and delivery behavior.
        </p>
        <a href={`/${locale}/admin/ads/telemetry`} className="text-sm text-primary underline">
          Open ads telemetry
        </a>
      </div>
      <AdminAdsManager />
    </div>
  );
}
