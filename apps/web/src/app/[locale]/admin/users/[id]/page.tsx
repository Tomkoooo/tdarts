import React from 'react';
import { notFound } from 'next/navigation';
import { AdminUsersQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { AdminSection } from '@/features/admin/components/AdminSection';
import { AdminUserDetailForms } from '@/features/admin/users/AdminUserDetailForms';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE)) notFound();

  const { locale, id } = await params;
  const user = await AdminUsersQueryService.getById(id);
  if (!user) notFound();

  const ctx = await AdminUsersQueryService.getUserAdminContext(id);
  const initialSnapshot = {
    isAdmin: user.isAdmin,
    isVerified: user.isVerified,
    isDeleted: user.isDeleted,
    adminRoles: [...user.adminRoles],
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader title={user.name} description={user.email} backHref="/admin/users" backLabel="Users" />

      <AdminSection title="Profile">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Username</dt>
            <dd>{user.username}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Locale / country</dt>
            <dd>
              {user.locale ?? '—'} / {user.country ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Auth</dt>
            <dd>{user.authProvider ?? '—'}</dd>
          </div>
        </dl>
      </AdminSection>

      <AdminUserDetailForms
        locale={locale}
        user={user}
        initialSnapshot={initialSnapshot}
        linkedPlayerId={ctx?.linkedPlayerId ?? null}
        subscriptionCount={ctx?.subscriptionCount ?? 0}
        managedClubsCount={ctx?.managedClubsCount ?? 0}
      />
    </div>
  );
}
