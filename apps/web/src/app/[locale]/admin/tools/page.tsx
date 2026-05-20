import { getTranslations } from 'next-intl/server';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { AdminToolsPanel } from '@/features/admin/tools/AdminToolsPanel';

export default async function AdminToolsPage() {
  const t = await getTranslations('Admin.tools');

  return (
    <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
      <AdminToolsPanel />
    </AdminPageContainer>
  );
}
