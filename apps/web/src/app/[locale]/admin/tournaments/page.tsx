import { getTranslations } from 'next-intl/server';
import { adminListTournamentsAction, type AdminTournamentsListParams } from '@/features/admin/tournaments/actions';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { AdminListFilter } from '@/features/admin/list/AdminListFilter';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { TOURNAMENT_SORT_OPTIONS } from '@/features/admin/list/sort-options';
import { TournamentsDirectoryTable } from '@/features/admin/tournaments/TournamentsDirectoryTable';
import { AdminListPageKpi } from '@/features/admin/components/AdminListPageKpi';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminTournamentsPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const params: AdminTournamentsListParams = {
    ...parseAdminListParams(sp, ADMIN_LIST_DEFAULTS.tournaments),
    status: first(sp.status) ?? 'all',
  };
  const extraQuery = { status: params.status };
  const result = await adminListTournamentsAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell
        title={t('layout.sidebar.tournaments')}
        params={params}
        searchPlaceholder={t('list.search_tournaments')}
        extraQuery={extraQuery}
      >
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('layout.sidebar.tournaments')}
      description={t('list.tournaments_description')}
      params={params}
      searchPlaceholder={t('list.search_tournaments')}
      sortOptions={TOURNAMENT_SORT_OPTIONS}
      extraQuery={extraQuery}
      filters={
        <AdminListFilter
          params={params}
          paramKey="status"
          value={params.status ?? 'all'}
          label={t('list.filter_status')}
          extra={extraQuery}
          options={[
            { value: 'all', label: t('list.filter_all') },
            { value: 'pending', label: 'pending' },
            { value: 'active', label: 'active' },
            { value: 'finished', label: 'finished' },
            { value: 'cancelled', label: 'cancelled' },
          ]}
        />
      }
    >
      <AdminListPageKpi
        domain="tournaments"
        trendTitle="Versenyek státusz szerint"
        range={first(sp.kpiRange)}
        from={first(sp.kpiFrom)}
        to={first(sp.kpiTo)}
        group={first(sp.kpiGroup)}
        chartType={first(sp.kpiChart)}
        params={params}
        extraQuery={extraQuery}
      />
      <TournamentsDirectoryTable
        rows={result.rows}
        total={result.total}
        params={params}
        extraQuery={extraQuery}
      />
    </AdminDirectoryShell>
  );
}
