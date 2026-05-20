import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { AdminAuthorizationService } from '@tdarts/services';
import { AdminShell } from '@/features/admin/components/admin-shell';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  noStore();
  const { locale } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/admin`)}`);
  }

  const canShell = await AdminAuthorizationService.canAccessAdminShell(user._id);
  if (!canShell) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-admin-surface">
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="p-4 rounded-full bg-admin-surface-container inline-block mb-4">
            <span className="material-symbols-outlined text-4xl text-admin-error">
              lock
            </span>
          </div>
          <h1 className="text-xl font-semibold text-admin-on-surface">Access denied</h1>
          <p className="mt-2 text-admin-on-surface-variant">
            You don&apos;t have permission to open the admin area.
          </p>
        </div>
      </div>
    );
  }

  const capabilities = await AdminAuthorizationService.getEffectiveCapabilities(user._id);

  return (
    <AdminShell
      locale={locale}
      capabilities={capabilities}
      userName={user.username || user.email}
      userEmail={user.email}
    >
      {children}
    </AdminShell>
  );
}
