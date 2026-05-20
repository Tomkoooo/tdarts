import { getTranslations } from 'next-intl/server';
import { adminListUsersAction, type AdminUsersListParams } from '@/features/admin/users/actions';
import { AdminListFilter } from '@/features/admin/list/AdminListFilter';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { USER_SORT_OPTIONS } from '@/features/admin/list/sort-options';
import { UsersDirectoryWithSheet } from '@/features/admin/users/UsersDirectoryWithSheet';
import { AdminListPageKpi } from '@/features/admin/components/AdminListPageKpi';

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const params: AdminUsersListParams = {
    ...parseAdminListParams(sp, ADMIN_LIST_DEFAULTS.users),
    isVerified: (first(sp.isVerified) as AdminUsersListParams['isVerified']) ?? 'all',
    isDeleted: (first(sp.isDeleted) as AdminUsersListParams['isDeleted']) ?? 'all',
    isAdmin: (first(sp.isAdmin) as AdminUsersListParams['isAdmin']) ?? 'all',
  };
  const extraQuery = {
    isVerified: params.isVerified,
    isDeleted: params.isDeleted,
    isAdmin: params.isAdmin,
  };
  const result = await adminListUsersAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell
        title={t('layout.sidebar.users')}
        params={params}
        searchPlaceholder={t('list.search_placeholder')}
      >
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('layout.sidebar.users')}
      description={t('list.users_description')}
      params={params}
      searchPlaceholder={t('list.search_placeholder')}
      sortOptions={USER_SORT_OPTIONS}
      extraQuery={extraQuery}
      filters={
        <>
          <AdminListFilter
            params={params}
            paramKey="isVerified"
            value={params.isVerified ?? 'all'}
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
            paramKey="isDeleted"
            value={params.isDeleted ?? 'all'}
            label={t('list.filter_deleted')}
            extra={extraQuery}
            options={[
              { value: 'all', label: t('list.filter_all') },
              { value: 'yes', label: t('list.filter_yes') },
              { value: 'no', label: t('list.filter_no') },
            ]}
          />
          <AdminListFilter
            params={params}
            paramKey="isAdmin"
            value={params.isAdmin ?? 'all'}
            label={t('list.filter_admin')}
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
        domain="users"
        trendTitle="Regisztrációk időben"
        range={first(sp.kpiRange)}
        from={first(sp.kpiFrom)}
        to={first(sp.kpiTo)}
        group={first(sp.kpiGroup)}
        chartType={first(sp.kpiChart)}
        params={params}
        extraQuery={extraQuery}
      />
      <UsersDirectoryWithSheet rows={result.rows} total={result.total} params={params} />
    </AdminDirectoryShell>
  );
}
