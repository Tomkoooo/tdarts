import { getTranslations } from 'next-intl/server';
import { AdminDirectoryShell } from '@/features/admin/list/AdminDirectoryShell';
import { parseAdminListParams } from '@/features/admin/lib/list-params';
import { ADMIN_LIST_DEFAULTS } from '@/features/admin/lib/list-defaults';
import { FEEDBACK_SORT_OPTIONS } from '@/features/admin/list/sort-options';
import {
  adminListFeedbackAction,
  type AdminFeedbackListParams,
} from '@/features/admin/feedback/actions';
import { FeedbackFilters } from '@/features/admin/feedback/FeedbackFilters';
import { FeedbackInboxWithSheet } from '@/features/admin/feedback/FeedbackInboxWithSheet';

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminFeedbackPage({ searchParams }: Props) {
  const t = await getTranslations('Admin');
  const sp = await searchParams;
  const params: AdminFeedbackListParams = {
    ...parseAdminListParams(sp, ADMIN_LIST_DEFAULTS.feedback),
    status: first(sp.status) ?? 'all',
    priority: first(sp.priority) ?? 'all',
    unreadAdmin: first(sp.unreadAdmin) === '1',
  };
  const extraQuery = {
    status: params.status,
    priority: params.priority,
    unreadAdmin: params.unreadAdmin ? '1' : undefined,
  };
  const result = await adminListFeedbackAction(params);

  if (!result.ok) {
    return (
      <AdminDirectoryShell
        title={t('layout.sidebar.feedback')}
        params={params}
        searchPlaceholder=""
      >
        <p className="text-destructive text-sm">{result.error}</p>
      </AdminDirectoryShell>
    );
  }

  return (
    <AdminDirectoryShell
      title={t('layout.sidebar.feedback')}
      description={t('feedback.list_description')}
      params={params}
      sortOptions={FEEDBACK_SORT_OPTIONS}
      searchPlaceholder=""
      filters={<FeedbackFilters params={params} extraQuery={extraQuery} />}
    >
      <FeedbackInboxWithSheet
        rows={result.rows}
        total={result.total}
        params={params}
        extraQuery={extraQuery}
      />
    </AdminDirectoryShell>
  );
}
