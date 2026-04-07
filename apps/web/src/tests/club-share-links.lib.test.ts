import {
  buildClubLoginRedirectShareLink,
  buildClubPublicShareLink,
  buildClubSelectedTournamentsShortShareLink,
} from '@/lib/club-share-links';

describe('club-share-links', () => {
  it('builds locale-prefixed public and login-redirect URLs', () => {
    expect(buildClubPublicShareLink('https://tdarts.hu', 'en', 'club1')).toBe(
      'https://tdarts.hu/en/clubs/club1?page=tournaments'
    );
    const login = buildClubLoginRedirectShareLink('https://tdarts.hu', 'hu', 'club1');
    expect(login).toContain('/hu/auth/login?redirect=');
    expect(decodeURIComponent(login.split('redirect=')[1])).toBe('/hu/clubs/club1?page=tournaments');
  });

  it('builds short selected-tournaments share URL', () => {
    expect(buildClubSelectedTournamentsShortShareLink('https://tdarts.hu', 'en', 'abc123')).toBe(
      'https://tdarts.hu/en/s/abc123'
    );
  });
});
