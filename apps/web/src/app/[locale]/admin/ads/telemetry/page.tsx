import { AdsTelemetryDashboard } from '@/components/admin/ads/AdsTelemetryDashboard';
import { authorizeUserResult } from '@/shared/lib/guards';
import { AdminAuthorizationService, ADMIN_CAPABILITIES } from '@tdarts/services';
import { redirect } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

export default async function AdminAdsTelemetryPage({ params }: Props) {
  const { locale } = await params;
  const auth = await authorizeUserResult();
  if (!auth.ok) redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/admin/ads/telemetry`)}`);

  const allowed = await AdminAuthorizationService.hasAdminCapability(
    auth.data.userId,
    ADMIN_CAPABILITIES.ADMIN_ADS_TELEMETRY_READ
  );
  if (!allowed) redirect(`/${locale}/profile`);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Ads telemetry</h1>
      <p className="text-sm text-muted-foreground">Ads-only campaign metrics and trends.</p>
      <AdsTelemetryDashboard />
    </div>
  );
}

