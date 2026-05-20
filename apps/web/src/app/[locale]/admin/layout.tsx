import { getServerUser } from '@/lib/getServerUser';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { AdminAuthorizationService } from '@tdarts/services';

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
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to open the admin area.
          </p>
        </div>
      </div>
    );
  }

  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
