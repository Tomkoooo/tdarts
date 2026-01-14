import { MetadataRoute } from 'next';
import { ClubService } from '@/database/services/club.service';
import { TournamentService } from '@/database/services/tournament.service';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://tdarts.hu';
  
  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  // Dynamic club pages
  let clubPages: MetadataRoute.Sitemap = [];
  try {
    // We fetch clubs but with a timeout to avoid hanging if DB is slow or unreachable (though force-dynamic helps)
    const clubs = await ClubService.getAllClubs();
    clubPages = clubs.map((club: { _id: string; updatedAt?: Date }) => ({
      url: `${baseUrl}/clubs/${club._id}`,
      lastModified: club.updatedAt || new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Error fetching clubs for sitemap:', error);
  }

  // Dynamic tournament pages
  let tournamentPages: MetadataRoute.Sitemap = [];
  try {
    const tournaments = await TournamentService.getAllTournaments();
    tournamentPages = tournaments.map((tournament: { tournamentId: string; updatedAt?: Date }) => ({
      url: `${baseUrl}/tournaments/${tournament.tournamentId}`,
      lastModified: tournament.updatedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching tournaments for sitemap:', error);
  }

  return [...staticPages, ...clubPages, ...tournamentPages];
}
