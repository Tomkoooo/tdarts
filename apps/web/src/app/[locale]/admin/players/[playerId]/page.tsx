import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`Player ${playerId}`} />
    </main>
  );
}
