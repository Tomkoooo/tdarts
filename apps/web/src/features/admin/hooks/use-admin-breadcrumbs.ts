'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { adminNavGroups } from '@/features/admin/config/nav';
import { matchAdminBreadcrumbRoute } from '@/features/admin/config/breadcrumb-routes';
import { useAdminBreadcrumbLabel } from '@/features/admin/providers/AdminBreadcrumbLabelContext';

type Crumb = { title: string; href?: string };

function flattenNav(): { href: string; titleKey: string }[] {
  const rows: { href: string; titleKey: string }[] = [];
  for (const group of adminNavGroups) {
    for (const item of group.items) {
      rows.push({ href: item.href, titleKey: item.titleKey });
      for (const child of item.items ?? []) {
        rows.push({ href: child.href, titleKey: child.titleKey });
      }
    }
  }
  return rows;
}

const NAV_FLAT = flattenNav();

export function useAdminBreadcrumbs(): Crumb[] {
  const pathname = usePathname();
  const t = useTranslations('Admin');
  const dynamicLabel = useAdminBreadcrumbLabel()?.label;

  return useMemo(() => {
    const crumbs: Crumb[] = [{ title: t('layout.sidebar.title'), href: '/admin' }];
    const dynamic = matchAdminBreadcrumbRoute(pathname);

    if (dynamic) {
      crumbs.push({
        title: t(dynamic.route.titleKey),
        href: dynamic.route.listHref,
      });
      crumbs.push({
        title: dynamicLabel ?? dynamic.id.slice(0, 12) + (dynamic.id.length > 12 ? '…' : ''),
      });
      return crumbs;
    }

    const match = NAV_FLAT.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
    if (match && match.href !== '/admin') {
      crumbs.push({ title: t(match.titleKey), href: match.href });
    }
    if (pathname !== match?.href && pathname.includes('/')) {
      const segment = pathname.split('/').filter(Boolean).pop();
      if (segment && segment !== 'admin' && !ObjectIdLike(segment)) {
        crumbs.push({ title: segment });
      }
    }
    return crumbs;
  }, [pathname, t, dynamicLabel]);
}

function ObjectIdLike(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s);
}
