import { MatchDetailView } from '@/features/admin/matches/MatchDetailView';

export default async function AdminMatchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; matchId: string }>;
}) {
  const { locale, matchId } = await params;
  return <MatchDetailView locale={locale} matchId={matchId} />;
}
