'use client';

import { AdminPageContainer } from '@/features/admin/components/layout/page-container';
import { Link } from '@/i18n/routing';
import { ChevronLeft } from 'lucide-react';
import { AdminDetailTabs, type AdminDetailTab } from '@/features/admin/detail/AdminDetailTabs';

type Props = {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
  tabs: AdminDetailTab[];
  headerAction?: React.ReactNode;
};

export function AdminDetailShell({
  title,
  description,
  backHref,
  backLabel,
  tabs,
  headerAction,
}: Props) {
  return (
    <AdminPageContainer
      pageTitle={title}
      pageDescription={description}
      pageHeaderAction={headerAction}
    >
      <Link
        href={backHref}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm"
      >
        <ChevronLeft className="size-4" />
        {backLabel}
      </Link>
      <AdminDetailTabs tabs={tabs} />
    </AdminPageContainer>
  );
}
