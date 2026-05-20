import '@/styles/themes/admin-claude.css';
import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { AdminAuthorizationService } from '@tdarts/services';
import { getAdminContextAction } from '@/features/admin/actions/getAdminContext.action';
import { AdminShell } from '@/features/admin/components/layout/admin-shell';

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
      <div className="dark flex min-h-screen items-center justify-center bg-background p-6" data-theme="claude">
        <div className="max-w-md rounded-xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Hozzáférés megtagadva</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nincs jogosultságod az admin felület megnyitásához.
          </p>
        </div>
      </div>
    );
  }

  const context = await getAdminContextAction();
  if (!context) {
    redirect(`/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/admin`)}`);
  }

  const cookieStore = await cookies();
  const defaultSidebarOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  return (
    <div className="dark min-h-screen bg-background text-foreground" data-theme="claude">
      <AdminShell context={context} defaultSidebarOpen={defaultSidebarOpen}>
        {children}
      </AdminShell>
    </div>
  );
}
