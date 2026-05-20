import { getTranslations } from 'next-intl/server';
import { getServerUser } from '@/lib/getServerUser';
import { AdminAuthorizationService, ADMIN_CAPABILITIES } from '@tdarts/services';
import { adminListAnnouncementsAction } from '@/features/admin/content/actions';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { CONTENT_SORT_OPTIONS } from '@/features/admin/list/sort-options';
import { ContentAdminPanel } from '@/features/admin/content/ContentAdminPanel';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminContentPage({ searchParams }: Props) {
  const t = await getTranslations('Admin.content');
  const params = parseAdminListParams(await searchParams, ADMIN_LIST_DEFAULTS.content);
  const user = await getServerUser();
  const canWrite = user
    ? await AdminAuthorizationService.hasAdminCapability(
        user._id,
        ADMIN_CAPABILITIES.ADMIN_CONTENT_WRITE,
      )
    : false;

  const result = await adminListAnnouncementsAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell title={t('title')} params={params} searchPlaceholder={t('search_placeholder')}>
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('title')}
      description={t('description')}
      params={params}
      searchPlaceholder={t('search_placeholder')}
      sortOptions={CONTENT_SORT_OPTIONS}
    >
      {!canWrite ? (
        <p className="text-muted-foreground mb-2 text-xs">{t('read_only')}</p>
      ) : null}
      <ContentAdminPanel
        rows={result.rows}
        total={result.total}
        params={params}
        canWrite={canWrite}
      />
    </AdminDirectoryShell>
  );
}
