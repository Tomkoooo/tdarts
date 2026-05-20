import { getTranslations } from 'next-intl/server';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { FeatureAccessPanel } from '@/features/admin/feature-access/FeatureAccessPanel';

export default async function AdminFeatureAccessPage() {
  const t = await getTranslations('Admin.feature_access');

  return (
    <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
      <FeatureAccessPanel />
    </AdminPageContainer>
  );
}
