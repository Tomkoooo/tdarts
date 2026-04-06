import { AnnouncementService } from '@/database/services/announcement.service';

jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/database/models/announcement.model', () => ({
  AnnouncementModel: {
    find: jest.fn(),
  },
}));

describe('AnnouncementService locale visibility', () => {
  it('hides announcement in strict mode when locale text is missing', async () => {
    const { AnnouncementModel } = await import('@/database/models/announcement.model');
    (AnnouncementModel.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'a1',
            title: 'HU title',
            description: 'HU desc',
            localeVisibilityMode: 'strict',
            localized: {
              hu: { title: 'HU title', description: 'HU desc' },
            },
          },
        ]),
      }),
    });

    const result = await AnnouncementService.getActiveAnnouncements('de');
    expect(result).toHaveLength(0);
  });

  it('falls back to english in fallback_en mode when locale text is missing', async () => {
    const { AnnouncementModel } = await import('@/database/models/announcement.model');
    (AnnouncementModel.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: 'a2',
            title: 'HU title',
            description: 'HU desc',
            localeVisibilityMode: 'fallback_en',
            localized: {
              en: { title: 'EN title', description: 'EN desc' },
            },
          },
        ]),
      }),
    });

    const result = await AnnouncementService.getActiveAnnouncements('de');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('EN title');
    expect(result[0].description).toBe('EN desc');
  });
});
