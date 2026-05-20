import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`Club ${clubId}`} />
    </main>
  );
}
