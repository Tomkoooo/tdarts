import sitemap from '@/app/sitemap';
import { ClubService } from '@/database/services/club.service';
import { TournamentService } from '@/database/services/tournament.service';

jest.mock('@/database/services/club.service', () => ({
  ClubService: {
    getAllClubs: jest.fn(),
  },
}));

jest.mock('@/database/services/tournament.service', () => ({
  TournamentService: {
    getAllTournaments: jest.fn(),
  },
}));

describe('sitemap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
