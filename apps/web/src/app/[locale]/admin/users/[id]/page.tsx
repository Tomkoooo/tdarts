import React from 'react';
import { notFound } from 'next/navigation';
import { AdminUsersQueryService } from '@tdarts/services';
import { getStaffSession, staffHasCapability } from '@/features/admin/rbac/staff-session';
import { ADMIN_CAPABILITIES } from '@tdarts/services';
import { Link } from '@/i18n/routing';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSession();
  if (!session || !staffHasCapability(session, ADMIN_CAPABILITIES.ADMIN_USERS_MANAGE)) notFound();

  const { id } = await params;
  const user = await AdminUsersQueryService.getById(id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
          ← Users
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <section className="rounded-xl border border-border/60 bg-card/40 p-4">
        <h2 className="text-sm font-semibold">Profile</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
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
            <dt className="text-muted-foreground">Roles</dt>
            <dd className="font-mono text-xs">
              isAdmin={String(user.isAdmin)} · adminRoles=[{user.adminRoles.join(', ')}]
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
