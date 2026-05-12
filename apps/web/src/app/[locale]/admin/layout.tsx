import { redirect } from "next/navigation";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { getServerUser } from "@/lib/getServerUser";
import { AdminAuthorizationService, ADMIN_CAPABILITIES } from "@tdarts/services";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params;
  const user = await getServerUser();

  if (!user?._id) {
    redirect(`/${locale}/auth/login?redirect=${encodeURIComponent(`/${locale}/admin`)}`);
  }

  const canAccessAdmin =
    user.isAdmin ||
    (Array.isArray(user.adminRoles) &&
      user.adminRoles.length > 0 &&
      (await AdminAuthorizationService.hasAdminCapability(String(user._id), ADMIN_CAPABILITIES.ADMIN_SHELL)));

  if (!canAccessAdmin) {
    redirect(`/${locale}/profile`);
  }

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
