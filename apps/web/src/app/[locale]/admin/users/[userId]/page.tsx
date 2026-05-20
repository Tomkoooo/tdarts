import { UserDetailView } from '@/features/admin/users/UserDetailView';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { locale, userId } = await params;
  return <UserDetailView locale={locale} userId={userId} />;
}
