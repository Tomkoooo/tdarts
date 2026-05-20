import { PlayerDetailView } from '@/features/admin/players/PlayerDetailView';

export default async function AdminPlayerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; playerId: string }>;
}) {
  const { locale, playerId } = await params;
  return <PlayerDetailView locale={locale} playerId={playerId} />;
}
