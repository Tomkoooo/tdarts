import { getTranslations } from 'next-intl/server';
import { adminListPlayersAction } from '@/features/admin/players/actions';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { PLAYER_SORT_OPTIONS } from '@/features/admin/list/sort-options';
import { PlayersDirectoryTable } from '@/features/admin/players/PlayersDirectoryTable';
import { AdminListPageKpi } from '@/features/admin/components/AdminListPageKpi';

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPlayersPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const params = parseAdminListParams(sp, ADMIN_LIST_DEFAULTS.players);
  const result = await adminListPlayersAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell
        title={t('nav.players')}
        params={params}
        searchPlaceholder={t('list.search_players')}
      >
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('nav.players')}
      description={t('list.players_description')}
      params={params}
      searchPlaceholder={t('list.search_players')}
      sortOptions={PLAYER_SORT_OPTIONS}
    >
      <AdminListPageKpi
        domain="players"
        trendTitle="Játékos típusok"
        range={first(sp.kpiRange)}
        from={first(sp.kpiFrom)}
        to={first(sp.kpiTo)}
        group={first(sp.kpiGroup)}
        chartType={first(sp.kpiChart)}
        params={params}
      />
      <PlayersDirectoryTable rows={result.rows} total={result.total} params={params} />
    </AdminDirectoryShell>
  );
}
