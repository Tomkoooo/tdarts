import { getTranslations } from 'next-intl/server';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { AdsAdminPanel } from '@/features/admin/ads/AdsAdminPanel';
import {
  adminAdsTelemetrySummaryAction,
  adminGetAdsPageDataAction,
} from '@/features/admin/ads/actions';

export default async function AdminAdsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Admin.ads');
  const result = await adminGetAdsPageDataAction();

  if (!result.ok) {
    return (
      <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminPageContainer>
    );
  }

  const telemetryResult = result.canTelemetry
    ? await adminAdsTelemetrySummaryAction()
    : null;
  const telemetry =
    telemetryResult && telemetryResult.ok ? telemetryResult.data : null;

  return (
    <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
      <AdsAdminPanel
        locale={locale}
        campaigns={result.campaigns}
        overview={result.overview}
        canWrite={result.canWrite}
        canTelemetry={result.canTelemetry}
        telemetry={telemetry}
      />
    </AdminPageContainer>
  );
}
