import sitemap from '@/app/sitemap';
import { ClubService, TournamentService } from '@tdarts/services';

jest.mock('@tdarts/services', () => ({
  ...jest.requireActual('@tdarts/services'),
  ClubService: {
    getAllClubs: jest.fn(),
  },
  TournamentService: {
    getAllTournaments: jest.fn(),
  },
}));

describe('sitemap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes map page urls', async () => {
    (ClubService.getAllClubs as jest.Mock).mockResolvedValue([]);
    (TournamentService.getAllTournaments as jest.Mock).mockResolvedValue([]);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls.some((url) => url.includes('/map'))).toBe(true);
  });

  it('includes active club urls', async () => {
    (ClubService.getAllClubs as jest.Mock).mockResolvedValue([
      { _id: 'club123', updatedAt: new Date('2026-01-01') },
    ]);
    (TournamentService.getAllTournaments as jest.Mock).mockResolvedValue([]);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls.some((url) => url.includes('/clubs/club123'))).toBe(true);
  });

  it('prefers public club code over internal id in sitemap urls', async () => {
    (ClubService.getAllClubs as jest.Mock).mockResolvedValue([
      { _id: 'mongo-internal-id', code: 'public-club-code', updatedAt: new Date('2026-01-01') },
    ]);
    (TournamentService.getAllTournaments as jest.Mock).mockResolvedValue([]);

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.includes('/clubs/public-club-code'))).toBe(true);
    expect(urls.some((url) => url.includes('/clubs/mongo-internal-id'))).toBe(false);
  });
});
