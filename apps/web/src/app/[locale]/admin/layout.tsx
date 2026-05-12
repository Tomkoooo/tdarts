import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import { AdminAuthorizationService } from '@tdarts/services';
import { AdminShell } from '@/features/admin/shell/AdminShell';
import { AdminForbiddenPanel } from '@/features/admin/shell/AdminForbiddenPanel';
import { ADMIN_NAV_GROUPS, filterNavGroupsForCapabilities } from '@/features/admin/shell/nav-config';
import { getStaffSession } from '@/features/admin/rbac/staff-session';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/admin`)}`);
  }

  const canShell = await AdminAuthorizationService.canAccessAdminShell(user._id);
  if (!canShell) {
    return <AdminForbiddenPanel />;
  }

  const session = await getStaffSession();
  if (!session) {
    return <AdminForbiddenPanel />;
  }

  const navGroups = filterNavGroupsForCapabilities(ADMIN_NAV_GROUPS, session.capabilities);

  return (
    <AdminShell userLabel={session.user.name || session.user.email} navGroups={navGroups}>
      {children}
    </AdminShell>
  );
}
