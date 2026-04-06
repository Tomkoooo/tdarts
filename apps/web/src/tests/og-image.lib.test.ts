import {
  DEFAULT_OG_PATH,
  pickClubOgImagePath,
  pickTournamentOgImagePath,
  toAbsoluteImageUrl,
  ogImageDimensionsForPath,
} from '@/lib/og-image';

describe('og-image', () => {
  const base = 'https://tdarts.hu';

  describe('toAbsoluteImageUrl', () => {
    it('prefixes relative paths', () => {
      expect(toAbsoluteImageUrl('/foo.png', base)).toBe('https://tdarts.hu/foo.png');
      expect(toAbsoluteImageUrl('foo.png', base)).toBe('https://tdarts.hu/foo.png');
    });

    it('leaves absolute URLs unchanged', () => {
      expect(toAbsoluteImageUrl('https://cdn.example.com/x.png', base)).toBe(
        'https://cdn.example.com/x.png'
      );
    });

    it('falls back to default when empty', () => {
      expect(toAbsoluteImageUrl(undefined, base)).toBe(`${base}${DEFAULT_OG_PATH}`);
    });
  });

  describe('pickClubOgImagePath', () => {
    it('uses landing cover, then club logo, then landing logo, then default', () => {
      expect(pickClubOgImagePath({ landingPage: { coverImage: '/c.jpg' }, logo: '/l.svg' })).toBe(
        '/c.jpg'
      );
      expect(pickClubOgImagePath({ logo: '/l.svg', landingPage: { logo: '/ll.svg' } })).toBe('/l.svg');
      expect(pickClubOgImagePath({ landingPage: { logo: '/ll.svg' } })).toBe('/ll.svg');
      expect(pickClubOgImagePath({})).toBe(DEFAULT_OG_PATH);
    });
  });

  describe('pickTournamentOgImagePath', () => {
    it('prefers tournament cover then club chain', () => {
      expect(
        pickTournamentOgImagePath(
          { coverImage: '/t.jpg' },
          { landingPage: { coverImage: '/club.jpg' } }
        )
      ).toBe('/t.jpg');
      expect(
        pickTournamentOgImagePath({}, { landingPage: { coverImage: '/club.jpg' }, logo: '/x' })
      ).toBe('/club.jpg');
      expect(pickTournamentOgImagePath({}, {})).toBe(DEFAULT_OG_PATH);
    });
  });

  describe('ogImageDimensionsForPath', () => {
    it('uses small dimensions for default asset', () => {
      expect(ogImageDimensionsForPath(DEFAULT_OG_PATH)).toEqual({ width: 512, height: 512 });
    });

    it('uses OG aspect for other relative paths', () => {
      expect(ogImageDimensionsForPath('/uploads/x.jpg')).toEqual({ width: 1200, height: 630 });
    });
  });
});
