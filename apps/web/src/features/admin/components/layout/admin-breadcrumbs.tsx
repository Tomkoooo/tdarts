'use client';

import { Fragment } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Link } from '@/i18n/routing';
import { useAdminBreadcrumbs } from '@/features/admin/hooks/use-admin-breadcrumbs';
import { ChevronRight } from 'lucide-react';

export function AdminBreadcrumbs() {
  const items = useAdminBreadcrumbs();
  if (items.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0 max-w-full overflow-hidden">
      <BreadcrumbList className="flex-nowrap items-center gap-1 overflow-x-auto text-xs [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 sm:text-sm [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => (
          <Fragment key={`${item.title}-${index}`}>
            {index !== items.length - 1 && item.href ? (
              <BreadcrumbItem className="shrink-0 whitespace-nowrap">
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.title}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            ) : null}
            {index < items.length - 1 ? (
              <BreadcrumbSeparator className="shrink-0">
                <ChevronRight className="size-3.5" />
              </BreadcrumbSeparator>
            ) : null}
            {index === items.length - 1 ? (
              <BreadcrumbItem className="min-w-0 shrink-0 whitespace-nowrap">
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              </BreadcrumbItem>
            ) : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
