import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminMatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`Match ${matchId}`} />
    </main>
  );
}
