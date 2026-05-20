import { getTranslations } from 'next-intl/server';
import { getServerUser } from '@/lib/getServerUser';
import { AdminAuthorizationService, AdminDataExplorerService, ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { AdminDataExplorerPanel } from '@/features/admin/data-explorer/AdminDataExplorerPanel';
import { Badge } from '@/components/ui/Badge';

export default async function AdminDataExplorerPage() {
  const t = await getTranslations('Admin.data_explorer');
  const user = await getServerUser();

  if (!user) {
    return (
      <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
        <p className="text-destructive text-sm">{t('unauthorized')}</p>
      </AdminPageContainer>
    );
  }

  const canRead = await AdminAuthorizationService.hasAdminCapability(
    user._id,
    ADMIN_CAPABILITIES.ADMIN_DATA_EXPLORER_READ,
  );
  if (!canRead) {
    return (
      <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
        <p className="text-destructive text-sm">{t('forbidden')}</p>
      </AdminPageContainer>
    );
  }

  const canWrite = await AdminAuthorizationService.hasAdminCapability(
    user._id,
    ADMIN_CAPABILITIES.ADMIN_DATA_EXPLORER_WRITE,
  );
  const collections = AdminDataExplorerService.listCollections();

  return (
    <AdminPageContainer pageTitle={t('title')} pageDescription={t('description')}>
      <div className="mb-4 flex justify-end">
        <Badge variant={canWrite ? 'secondary' : 'outline'}>
          {canWrite ? t('mode_write') : t('mode_read')}
        </Badge>
      </div>
      <AdminDataExplorerPanel collections={collections} canWrite={canWrite} />
    </AdminPageContainer>
  );
}
