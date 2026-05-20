import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminTournamentDetailPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>;
}) {
  const { tournamentId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`Tournament ${tournamentId}`} />
    </main>
  );
}
