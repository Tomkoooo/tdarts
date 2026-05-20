'use client';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AdminBreadcrumbs } from '@/features/admin/components/layout/admin-breadcrumbs';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Adapted from next-shadcn-dashboard-starter `header.tsx` (Clerk/theme demos removed). */
export function AdminHeader() {
  const t = useTranslations('Admin');

  return (
    <header className="bg-background/60 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-1 border-b backdrop-blur-md sm:gap-2 md:h-14">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden px-2 sm:gap-2 sm:px-4">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator orientation="vertical" className="mr-1 hidden h-4 shrink-0 sm:mr-2 sm:block" />
        <AdminBreadcrumbs />
      </div>
      <div className="flex shrink-0 items-center gap-1 px-2 sm:gap-2 sm:px-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/" className="gap-1.5">
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">{t('layout.back_to_home')}</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
