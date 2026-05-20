import { getTranslations } from 'next-intl/server';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { adminListApiErrorsAction } from '@/features/admin/observability/actions';
import { ObservabilityErrorsFilters } from '@/features/admin/observability/ObservabilityErrorsFilters';
import { ApiErrorsTable } from '@/features/admin/observability/ApiErrorsTable';

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ObservabilityErrorsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const t = await getTranslations('Admin.observability');
  const sp = await searchParams;
  const listParams = parseAdminListParams(sp);
  const resolvedRaw = first(sp.resolved);
  const resolved =
    resolvedRaw === '1' ? 'resolved' : resolvedRaw === '0' ? 'open' : ('all' as const);
  const extraQuery = {
    requestId: first(sp.requestId),
    resolved: resolvedRaw,
  };

  const result = await adminListApiErrorsAction({
    page: listParams.page,
    limit: listParams.limit,
    requestId: extraQuery.requestId,
    resolved,
  });

  if (!result.ok) {
    return (
      <AdminDirectoryShell title={t('errors')} params={listParams} searchPlaceholder="">
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('errors')}
      description={t('errors_desc')}
      params={listParams}
      searchPlaceholder=""
      filters={
        <ObservabilityErrorsFilters
          requestId={extraQuery.requestId}
          resolved={extraQuery.resolved}
        />
      }
    >
      <ApiErrorsTable
        locale={locale}
        events={result.events}
        params={listParams}
        extraQuery={extraQuery}
      />
    </AdminDirectoryShell>
  );
}
