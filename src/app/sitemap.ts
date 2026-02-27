import { MetadataRoute } from 'next';
import { ClubService } from '@/database/services/club.service';
import { TournamentService } from '@/database/services/tournament.service';
import { buildLocaleAlternates, getBaseUrl, localePath } from '@/lib/seo';

export const dynamic = 'force-dynamic';
export const revalidate = 86400; // 24 hours

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const createLocalizedEntry = (
    pathname: string,
    options: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'> = {}
  ): MetadataRoute.Sitemap[number] => ({
    ...options,
    url: `${baseUrl}${localePath(pathname, 'hu')}`,
    alternates: {
      languages: Object.fromEntries(
        Object.entries(buildLocaleAlternates(pathname)).map(([locale, localizedPath]) => [
          locale,
          `${baseUrl}${localizedPath}`,
        ])
      ),
    },
  });
  
  // Static pages
  const staticPages = [
    createLocalizedEntry('/', {
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    }),
    createLocalizedEntry('/search', {
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }),
    createLocalizedEntry('/how-it-works', {
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }),
  ];

  // Dynamic club pages
  let clubPages: MetadataRoute.Sitemap = [];
  try {
    // We fetch clubs but with a timeout to avoid hanging if DB is slow or unreachable (though force-dynamic helps)
    const clubs = await ClubService.getAllClubs();
    clubPages = clubs.map((club: { _id: string; updatedAt?: Date }) => createLocalizedEntry(`/clubs/${club._id}`, {
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
    tournamentPages = tournaments.map((tournament: { tournamentId: string; updatedAt?: Date }) => createLocalizedEntry(`/tournaments/${tournament.tournamentId}`, {
      lastModified: tournament.updatedAt || new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('Error fetching tournaments for sitemap:', error);
  }

  return [...staticPages, ...clubPages, ...tournamentPages];
}
