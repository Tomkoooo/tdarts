import { redirect } from "next/navigation";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
import { getServerUser } from "@/lib/getServerUser";

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

  if (!user.isAdmin) {
    redirect(`/${locale}/profile`);
  }

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
