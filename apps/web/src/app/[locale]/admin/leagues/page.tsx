import { getTranslations } from 'next-intl/server';
import { adminListLeaguesAction } from '@/features/admin/leagues/actions';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { LEAGUE_SORT_OPTIONS } from '@/features/admin/list/sort-options';
import { LeaguesDirectoryTable } from '@/features/admin/leagues/LeaguesDirectoryTable';
import { AdminListPageKpi } from '@/features/admin/components/AdminListPageKpi';

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminLeaguesPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const params = parseAdminListParams(sp, ADMIN_LIST_DEFAULTS.leagues);
  const result = await adminListLeaguesAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell
        title={t('layout.sidebar.leagues')}
        params={params}
        searchPlaceholder={t('list.search_leagues')}
      >
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('layout.sidebar.leagues')}
      description={t('list.leagues_description')}
      params={params}
      searchPlaceholder={t('list.search_leagues')}
      sortOptions={LEAGUE_SORT_OPTIONS}
    >
      <AdminListPageKpi
        domain="leagues"
        trendTitle="Ligák aktivitása"
        range={first(sp.kpiRange)}
        from={first(sp.kpiFrom)}
        to={first(sp.kpiTo)}
        group={first(sp.kpiGroup)}
        chartType={first(sp.kpiChart)}
        params={params}
      />
      <LeaguesDirectoryTable rows={result.rows} total={result.total} params={params} />
    </AdminDirectoryShell>
  );
}
