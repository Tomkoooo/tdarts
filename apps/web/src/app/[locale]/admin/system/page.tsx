import { getTranslations } from 'next-intl/server';
import { FEATURE_TOGGLE_KEYS } from '@tdarts/core';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { AdminSystemSettingsPanel } from '@/features/admin/system/AdminSystemSettingsPanel';
import { adminGetSystemSettingsAction } from '@/features/admin/system/actions';
import type { AdminSystemSettingsView } from '@/features/admin/system/types';

export default async function AdminSystemPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Admin.system');
  const result = await adminGetSystemSettingsAction();

  if (!result.ok || !result.snapshot) {
    return (
      <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
        <p className="text-destructive text-sm">{result.error ?? t('load_error')}</p>
      </AdminPageContainer>
    );
  }

  const initial: AdminSystemSettingsView = {
    features: result.snapshot.features,
    subscriptionPaywallEnabled: result.snapshot.subscriptionPaywallEnabled,
    superAdminBypassEnabled: result.snapshot.superAdminBypassEnabled,
    updatedAt: result.snapshot.updatedAt.toISOString(),
    updatedBy: result.snapshot.updatedBy,
  };

  return (
    <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
      <AdminSystemSettingsPanel
        locale={locale}
        canWrite={result.canWrite ?? false}
        toggleKeys={[...FEATURE_TOGGLE_KEYS]}
        initial={initial}
      />
    </AdminPageContainer>
  );
}
