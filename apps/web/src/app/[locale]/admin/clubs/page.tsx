import { getTranslations } from 'next-intl/server';
import { adminListClubsAction, type AdminClubsListParams } from '@/features/admin/clubs/actions';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { AdminListFilter } from '@/features/admin/list/AdminListFilter';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { CLUB_SORT_OPTIONS } from '@/features/admin/list/sort-options';
import { ClubsDirectoryTable } from '@/features/admin/clubs/ClubsDirectoryTable';
import { AdminListPageKpi } from '@/features/admin/components/AdminListPageKpi';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminClubsPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const base = parseAdminListParams(sp, ADMIN_LIST_DEFAULTS.clubs);
  const params: AdminClubsListParams = {
    ...base,
    verified: (first(sp.verified) as AdminClubsListParams['verified']) ?? 'all',
    isActive: (first(sp.isActive) as AdminClubsListParams['isActive']) ?? 'all',
  };
  const extraQuery = { verified: params.verified, isActive: params.isActive };
  const result = await adminListClubsAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell
        title={t('layout.sidebar.clubs')}
        params={params}
        searchPlaceholder={t('list.search_placeholder')}
        extraQuery={extraQuery}
      >
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('layout.sidebar.clubs')}
      description={t('list.clubs_description')}
      params={params}
      searchPlaceholder={t('list.search_clubs')}
      sortOptions={CLUB_SORT_OPTIONS}
      extraQuery={extraQuery}
      filters={
        <>
          <AdminListFilter
            params={params}
            paramKey="verified"
            value={params.verified ?? 'all'}
            label={t('list.filter_verified')}
            extra={extraQuery}
            options={[
              { value: 'all', label: t('list.filter_all') },
              { value: 'yes', label: t('list.filter_yes') },
              { value: 'no', label: t('list.filter_no') },
            ]}
          />
          <AdminListFilter
            params={params}
            paramKey="isActive"
            value={params.isActive ?? 'all'}
            label={t('list.filter_active')}
            extra={extraQuery}
            options={[
              { value: 'all', label: t('list.filter_all') },
              { value: 'yes', label: t('list.filter_yes') },
              { value: 'no', label: t('list.filter_no') },
            ]}
          />
        </>
      }
    >
      <AdminListPageKpi
        domain="clubs"
        trendTitle="Klubok és aktivitás"
        range={first(sp.kpiRange)}
        from={first(sp.kpiFrom)}
        to={first(sp.kpiTo)}
        group={first(sp.kpiGroup)}
        chartType={first(sp.kpiChart)}
        params={params}
        extraQuery={extraQuery}
      />
      <ClubsDirectoryTable
        rows={result.rows}
        total={result.total}
        params={params}
        extraQuery={extraQuery}
      />
    </AdminDirectoryShell>
  );
}
