import { ClubDetailView } from '@/features/admin/clubs/ClubDetailView';

export default async function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ locale: string; clubId: string }>;
}) {
  const { locale, clubId } = await params;
  return <ClubDetailView locale={locale} clubId={clubId} />;
}
