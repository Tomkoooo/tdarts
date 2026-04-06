import {
  extractSafeRedirectPath,
  parseOgTargetFromStrippedPath,
  resolveOgTargetFromSearchParams,
} from '@/lib/auth-redirect-path';

describe('auth-redirect-path', () => {
  const base = 'https://tdarts.hu';

  describe('extractSafeRedirectPath', () => {
    it('allows same-origin absolute URLs', () => {
      expect(extractSafeRedirectPath('/hu/tournaments/ABC', undefined, base)).toBe(
        '/hu/tournaments/ABC'
      );
      expect(
        extractSafeRedirectPath(undefined, undefined, 'https://tdarts.hu')
      ).toBeNull();
      expect(
        extractSafeRedirectPath('https://tdarts.hu/en/clubs/507f1f77bcf86cd799439011', undefined, base)
      ).toBe('/en/clubs/507f1f77bcf86cd799439011');
    });

    it('rejects other origins', () => {
      expect(
        extractSafeRedirectPath('https://evil.com/hu/tournaments/X', undefined, base)
      ).toBeNull();
    });

    it('rejects dangerous schemes', () => {
      expect(extractSafeRedirectPath('javascript:alert(1)', undefined, base)).toBeNull();
    });
  });

  describe('parseOgTargetFromStrippedPath', () => {
    it('parses tournaments with optional live/tv', () => {
      expect(parseOgTargetFromStrippedPath('/tournaments/my-code')).toEqual({
        kind: 'tournament',
        code: 'my-code',
      });
      expect(parseOgTargetFromStrippedPath('/tournaments/my-code/live')).toEqual({
        kind: 'tournament',
        code: 'my-code',
      });
      expect(parseOgTargetFromStrippedPath('/tournaments/my-code/tv?x=1')).toEqual({
        kind: 'tournament',
        code: 'my-code',
      });
    });

    it('parses clubs', () => {
      expect(parseOgTargetFromStrippedPath('/clubs/507f1f77bcf86cd799439011')).toEqual({
        kind: 'club',
        clubId: '507f1f77bcf86cd799439011',
      });
      expect(
        parseOgTargetFromStrippedPath('/clubs/507f1f77bcf86cd799439011?page=leagues')
      ).toEqual({
        kind: 'club',
        clubId: '507f1f77bcf86cd799439011',
      });
    });

    it('returns null for unrelated paths', () => {
      expect(parseOgTargetFromStrippedPath('/search')).toBeNull();
    });
  });

  describe('resolveOgTargetFromSearchParams', () => {
    it('combines extract + stripLocalePrefix + parse', () => {
      expect(
        resolveOgTargetFromSearchParams(
          { redirect: '/hu/tournaments/XYZ' },
          base
        )
      ).toEqual({ kind: 'tournament', code: 'XYZ' });
      expect(
        resolveOgTargetFromSearchParams(
          { callbackUrl: encodeURIComponent('/de/clubs/abc123') },
          base
        )
      ).toEqual({ kind: 'club', clubId: 'abc123' });
    });
  });
});
