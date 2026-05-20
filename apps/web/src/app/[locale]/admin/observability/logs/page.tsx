import { getTranslations } from 'next-intl/server';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { adminListObservabilityLogsAction } from '@/features/admin/observability/actions';
import { ObservabilityLogsFilters } from '@/features/admin/observability/ObservabilityLogsFilters';
import { ObservabilityLogsTable } from '@/features/admin/observability/ObservabilityLogsTable';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ObservabilityLogsPage({ searchParams }: Props) {
  const t = await getTranslations('Admin.observability');
  const sp = await searchParams;
  const params = parseAdminListParams(sp);
  const extraQuery = {
    preset: first(sp.preset),
    level: first(sp.level),
    category: first(sp.category),
    targetUserId: first(sp.targetUserId),
    actorUserId: first(sp.actorUserId),
  };
  const result = await adminListObservabilityLogsAction({
    page: params.page,
    limit: params.limit,
    level: extraQuery.level,
    category: extraQuery.category,
    adminOnly: extraQuery.preset === 'admin',
    metadataTargetUserId: extraQuery.targetUserId,
    actorUserId: extraQuery.actorUserId,
  });

  if (!result.ok) {
    return (
      <AdminDirectoryShell title={t('logs')} params={params} searchPlaceholder="">
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('logs')}
      description={t('logs_desc')}
      params={params}
      searchPlaceholder=""
      filters={
        <ObservabilityLogsFilters
          preset={extraQuery.preset === 'admin' ? 'admin' : undefined}
          level={extraQuery.level}
          category={extraQuery.category}
          targetUserId={extraQuery.targetUserId}
          actorUserId={extraQuery.actorUserId}
        />
      }
    >
      <ObservabilityLogsTable logs={result.logs} params={params} extraQuery={extraQuery} />
    </AdminDirectoryShell>
  );
}
