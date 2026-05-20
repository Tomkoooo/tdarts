import { TournamentDetailView } from '@/features/admin/tournaments/TournamentDetailView';
import { parseTournamentRelationFilters } from '@/features/admin/tournaments/tournament-relation-filters';

export default async function AdminTournamentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; tournamentId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, tournamentId } = await params;
  const sp = await searchParams;
  const relFilters = parseTournamentRelationFilters(sp);
  return (
    <TournamentDetailView locale={locale} tournamentId={tournamentId} relFilters={relFilters} />
  );
}
