'use client';

import { useTranslations } from 'next-intl';
import { AdminPageContainer } from '@/features/admin/components/layout/page-container';

type Props = {
  title?: string;
  titleKey?: string;
  note?: string;
  domain?: string;
};

/** Placeholder until Phase 3+ directory pages ship. */
export function AdminRouteStub({ title, titleKey, note, domain }: Props) {
  const t = useTranslations('Admin');
  const heading = titleKey ? t(titleKey) : (title ?? t('layout.sidebar.title'));

  return (
    <AdminPageContainer pageTitle={heading}>
      <div className="border-border rounded-lg border border-dashed p-8">
        <p className="text-muted-foreground text-sm">
          {note ??
            t('stub.default_note', { domain: domain ?? '…' })}
        </p>
      </div>
    </AdminPageContainer>
  );
}
