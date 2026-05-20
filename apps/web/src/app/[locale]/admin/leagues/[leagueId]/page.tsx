import { AdminRouteStub } from '@/features/admin/lib/AdminRouteStub';

export default async function AdminLeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  return (
    <main className="p-6">
      <AdminRouteStub title={`League ${leagueId}`} />
    </main>
  );
}
