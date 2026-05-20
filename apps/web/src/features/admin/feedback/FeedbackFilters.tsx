'use client';

import { AdminListFilter } from '@/features/admin/list/AdminListFilter';
import type { AdminFeedbackListParams } from '@/features/admin/feedback/actions';
import { useTranslations } from 'next-intl';

type Props = {
  params: AdminFeedbackListParams;
  extraQuery: Record<string, string | undefined>;
};

export function FeedbackFilters({ params, extraQuery }: Props) {
  const t = useTranslations('Admin.feedback');

  return (
    <>
      <AdminListFilter
        params={params}
        paramKey="status"
        value={params.status ?? 'all'}
        label={t('filter_status')}
        extra={extraQuery}
        options={[
          { value: 'all', label: t('filter_all') },
          { value: 'pending', label: 'pending' },
          { value: 'in-progress', label: 'in-progress' },
          { value: 'resolved', label: 'resolved' },
          { value: 'closed', label: 'closed' },
          { value: 'rejected', label: 'rejected' },
        ]}
      />
      <AdminListFilter
        params={params}
        paramKey="priority"
        value={params.priority ?? 'all'}
        label={t('filter_priority')}
        extra={extraQuery}
        options={[
          { value: 'all', label: t('filter_all') },
          { value: 'critical', label: 'critical' },
          { value: 'high', label: 'high' },
          { value: 'medium', label: 'medium' },
          { value: 'low', label: 'low' },
        ]}
      />
      <AdminListFilter
        params={params}
        paramKey="unreadAdmin"
        value={params.unreadAdmin ? '1' : 'all'}
        label={t('filter_unread')}
        extra={extraQuery}
        options={[
          { value: 'all', label: t('filter_all') },
          { value: '1', label: t('filter_unread_only') },
        ]}
      />
    </>
  );
}
