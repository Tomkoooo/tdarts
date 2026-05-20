import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { AdminListSearch } from '@/features/admin/list/AdminListSearch';
import { AdminListSort, type AdminSortOption } from '@/features/admin/list/AdminListSort';
import { AdminListToolbar } from '@/features/admin/list/AdminListToolbar';
import { AdminListParamsRedirect } from '@/features/admin/list/AdminListParamsRedirect';
import type { AdminListParams } from '@/features/admin/lib/list-params';

type Props = {
  title: string;
  description?: string;
  params: AdminListParams;
  searchPlaceholder?: string;
  extraQuery?: Record<string, string | undefined>;
  sortOptions?: AdminSortOption[];
  filters?: React.ReactNode;
  children: React.ReactNode;
};

export function AdminDirectoryShell({
  title,
  description,
  params,
  searchPlaceholder,
  extraQuery,
  sortOptions,
  filters,
  children,
}: Props) {
  const showToolbar = sortOptions?.length || searchPlaceholder || filters;

  return (
    <AdminPageContainer pageTitle={title} pageDescription={description}>
      <AdminListParamsRedirect params={params} extraQuery={extraQuery} />
      <div className="flex flex-col gap-4">
        {showToolbar ? (
          <div className="flex flex-col gap-3">
            {searchPlaceholder ? (
              <AdminListSearch
                params={params}
                placeholder={searchPlaceholder}
                extra={extraQuery}
              />
            ) : null}
            {sortOptions?.length || filters ? (
              <AdminListToolbar className="flex-wrap items-end gap-3">
                {sortOptions?.length ? (
                  <AdminListSort params={params} options={sortOptions} extraQuery={extraQuery} />
                ) : null}
                {filters}
              </AdminListToolbar>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </AdminPageContainer>
  );
}
