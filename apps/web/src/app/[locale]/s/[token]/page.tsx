import { redirect, notFound } from 'next/navigation';
import { ClubService } from '@/database/services/club.service';

type ShortSharePageProps = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function ShortSharePage({ params }: ShortSharePageProps) {
  const { locale, token } = await params;
  const resolved = await ClubService.resolveSelectedTournamentsShareToken(token);

  if (!resolved?.clubId) {
    notFound();
  }

  redirect(`/${locale}/clubs/${resolved.clubId}?page=tournaments&st=${encodeURIComponent(token)}`);
}
