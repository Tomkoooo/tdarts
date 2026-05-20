import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`User ${userId}`} />
    </main>
  );
}
