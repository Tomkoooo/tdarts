import { getTranslations } from 'next-intl/server';
import {
  adminListMatchTournamentBucketsAction,
  type AdminMatchesListParams,
} from '@/features/admin/matches/actions';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { AdminListFilter } from '@/features/admin/list/AdminListFilter';
import { AdminListNumberFilter } from '@/features/admin/list/AdminListNumberFilter';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { MatchesTournamentDirectory } from '@/features/admin/matches/MatchesTournamentDirectory';
import { AdminListPageKpi } from '@/features/admin/components/AdminListPageKpi';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminMatchesPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const params: AdminMatchesListParams = {
    ...parseAdminListParams(sp, ADMIN_LIST_DEFAULTS.matches),
    manualOnly: first(sp.manualOnly) === '1',
    status: first(sp.status) ?? 'all',
    type: first(sp.type) ?? 'all',
    round: first(sp.round),
    board: first(sp.board),
  };
  const extraQuery = {
    manualOnly: params.manualOnly ? '1' : undefined,
    status: params.status !== 'all' ? params.status : undefined,
    type: params.type !== 'all' ? params.type : undefined,
    round: params.round,
    board: params.board,
  };
  const result = await adminListMatchTournamentBucketsAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell
        title={t('nav.matches')}
        params={params}
        searchPlaceholder={t('list.search_matches')}
        extraQuery={extraQuery}
      >
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('nav.matches')}
      description={t('list.matches_description')}
      params={params}
      searchPlaceholder={t('list.search_matches')}
      extraQuery={extraQuery}
      filters={
        <>
          <AdminListFilter
            params={params}
            paramKey="status"
            value={params.status ?? 'all'}
            label={t('list.filter_status')}
            extra={extraQuery}
            options={[
              { value: 'all', label: t('list.filter_all') },
              { value: 'ongoing', label: 'ongoing' },
              { value: 'finished', label: 'finished' },
              { value: 'pending', label: 'pending' },
            ]}
          />
          <AdminListFilter
            params={params}
            paramKey="type"
            value={params.type ?? 'all'}
            label={t('list.filter_match_type')}
            extra={extraQuery}
            options={[
              { value: 'all', label: t('list.filter_all') },
              { value: 'group', label: 'group' },
              { value: 'knockout', label: 'knockout' },
            ]}
          />
          <AdminListNumberFilter
            params={params}
            paramKey="round"
            value={params.round ?? ''}
            label={t('list.filter_round')}
            placeholder="0"
            extra={extraQuery}
          />
          <AdminListNumberFilter
            params={params}
            paramKey="board"
            value={params.board ?? ''}
            label={t('list.filter_board')}
            placeholder="1"
            extra={extraQuery}
          />
          <AdminListFilter
            params={params}
            paramKey="manualOnly"
            value={params.manualOnly ? '1' : 'all'}
            label={t('list.filter_manual')}
            extra={extraQuery}
            options={[
              { value: 'all', label: t('list.filter_all') },
              { value: '1', label: t('list.filter_manual_only') },
            ]}
          />
        </>
      }
    >
      <AdminListPageKpi
        domain="matches"
        trendTitle="Meccsek státusz szerint"
        range={first(sp.kpiRange)}
        from={first(sp.kpiFrom)}
        to={first(sp.kpiTo)}
        group={first(sp.kpiGroup)}
        chartType={first(sp.kpiChart)}
        params={params}
        extraQuery={extraQuery}
      />
      <MatchesTournamentDirectory
        buckets={result.rows}
        total={result.total}
        params={params}
        extraQuery={extraQuery}
        filterParams={{
          q: params.q,
          manualOnly: params.manualOnly,
          status: params.status,
          type: params.type,
          round: params.round,
          board: params.board,
        }}
      />
    </AdminDirectoryShell>
  );
}
