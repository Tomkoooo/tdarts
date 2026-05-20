import { LeagueDetailView } from '@/features/admin/leagues/LeagueDetailView';

export default async function AdminLeagueDetailPage({
  params,
}: {
  params: Promise<{ leagueId: string }>;
}) {
  const { leagueId } = await params;
  return <LeagueDetailView leagueId={leagueId} />;
}
