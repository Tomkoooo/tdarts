'use client';

import { AdminAppSidebar } from '@/features/admin/components/layout/admin-app-sidebar';
import { AdminHeader } from '@/features/admin/components/layout/admin-header';
import { AdminBreadcrumbLabelProvider } from '@/features/admin/providers/AdminBreadcrumbLabelContext';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import type { AdminSessionContext } from '@/features/admin/types';

type Props = {
  children: React.ReactNode;
  context: AdminSessionContext;
  defaultSidebarOpen?: boolean;
};

/** Adapted from next-shadcn-dashboard-starter `dashboard/layout.tsx`. */
export function AdminShell({ children, context, defaultSidebarOpen = true }: Props) {
  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <AdminAppSidebar context={context} />
      <SidebarInset>
        <AdminBreadcrumbLabelProvider>
          <AdminHeader />
          {children}
        </AdminBreadcrumbLabelProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
