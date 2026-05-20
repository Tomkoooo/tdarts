'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { AdminNavIcons } from '@/features/admin/components/icons';
import { AdminUserNav } from '@/features/admin/components/layout/admin-user-nav';
import { useFilteredAdminNavGroups } from '@/features/admin/hooks/use-admin-nav';
import type { AdminSessionContext } from '@/features/admin/types';
import { Link, usePathname } from '@/i18n/routing';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  context: AdminSessionContext;
};

/** Adapted from next-shadcn-dashboard-starter `app-sidebar.tsx` (Clerk/org switcher removed). */
export function AdminAppSidebar({ context }: Props) {
  const pathname = usePathname();
  const t = useTranslations('Admin');
  const groups = useFilteredAdminNavGroups(context.capabilities);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-3 py-4 group-data-[collapsible=icon]:py-3">
        <Link href="/admin" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md text-sm">
            tD
          </span>
          <span className="truncate group-data-[collapsible=icon]:hidden">
            {t('layout.sidebar.title')}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {groups.map((group) => (
          <SidebarGroup key={group.labelKey} className="py-0">
            <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
              {t(group.labelKey)}
            </SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) => {
                const Icon = AdminNavIcons[item.icon];
                if (item.items && item.items.length > 0) {
                  return (
                    <Collapsible
                      key={item.href}
                      asChild
                      defaultOpen={item.items.some((c) => isActive(c.href))}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={t(item.titleKey)} isActive={isActive(item.href)}>
                            <Icon />
                            <span>{t(item.titleKey)}</span>
                            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((sub) => {
                              const SubIcon = AdminNavIcons[sub.icon];
                              return (
                                <SidebarMenuSubItem key={sub.href}>
                                  <SidebarMenuSubButton asChild isActive={isActive(sub.href)}>
                                    <Link href={sub.href}>
                                      <SubIcon className="size-4" />
                                      <span>{t(sub.titleKey)}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={t(item.titleKey)} isActive={isActive(item.href)}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{t(item.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <AdminUserNav context={context} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
