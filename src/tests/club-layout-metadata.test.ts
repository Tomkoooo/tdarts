import { buildClubMetadataValues } from '@/lib/clubSeo';

describe('club metadata fallback', () => {
  it('falls back to club name and description when seo fields are empty', async () => {
    const metadata = buildClubMetadataValues({
      code: 'abc123',
      name: 'Fallback Club',
      description: 'Fallback Description',
      location: 'Budapest',
      landingPage: { seo: {} },
      members: [],
    });
    expect(metadata.description).toBe('Fallback Description');
    expect(metadata.title).toContain('Fallback Club');
  });
});
