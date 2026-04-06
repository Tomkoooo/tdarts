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

  it('falls back to landing page about text when seo description and description are empty', async () => {
    const metadata = buildClubMetadataValues({
      code: 'abc123',
      name: 'Fallback Club',
      description: '',
      location: 'Budapest',
      landingPage: {
        seo: {},
        aboutText: '<p>Club about content with <strong>SEO text</strong>.</p>',
      } as any,
      members: [],
    } as any);

    expect(metadata.description).toContain('Club about content with SEO text.');
  });

  it('uses public code as canonical path token when both _id and code are present', async () => {
    const metadata = buildClubMetadataValues({
      _id: 'mongoid123',
      code: 'publiccode456',
      name: 'Canonical Club',
      description: 'Description',
      landingPage: { seo: {} },
      members: [],
    });

    expect(metadata.canonicalUrl).toContain('/clubs/publiccode456');
    expect(metadata.canonicalUrl).not.toContain('/clubs/mongoid123');
  });
});
