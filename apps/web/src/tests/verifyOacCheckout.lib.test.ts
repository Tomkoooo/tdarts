jest.mock('@/lib/szamlazz', () => ({
  SzamlazzService: { createOacInvoice: jest.fn() },
}));

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { retrieve: jest.fn() } },
  }))
);

jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn(),
}));

import {
  buildLocalizedClubUrl,
  buildLocalizedTournamentUrl,
  resolvePaymentLocaleForServerAction,
  resolvePaymentRedirectLocaleFromRequest,
} from '@/features/payments/lib/verifyOacCheckout';
import { NextRequest } from 'next/server';

describe('verifyOacCheckout helpers', () => {
  it('buildLocalizedClubUrl uses /[locale]/clubs/[code]', () => {
    expect(buildLocalizedClubUrl('https://tdarts.hu/', 'hu', 'abc')).toBe('https://tdarts.hu/hu/clubs/abc');
    expect(buildLocalizedClubUrl('http://localhost:3000', 'en', 'id with space')).toBe(
      'http://localhost:3000/en/clubs/id%20with%20space'
    );
  });

  it('buildLocalizedTournamentUrl strips trailing slash on base and encodes code', () => {
    expect(buildLocalizedTournamentUrl('https://tdarts.hu/', 'hu', 'N7A8')).toBe(
      'https://tdarts.hu/hu/tournaments/N7A8'
    );
    expect(buildLocalizedTournamentUrl('http://localhost:3000', 'en', 'A B')).toBe(
      'http://localhost:3000/en/tournaments/A%20B'
    );
  });

  it('resolvePaymentRedirectLocaleFromRequest reads NEXT_LOCALE and defaults to hu', () => {
    const withHu = new NextRequest('http://localhost/api', {
      headers: { cookie: 'NEXT_LOCALE=hu' },
    });
    expect(resolvePaymentRedirectLocaleFromRequest(withHu)).toBe('hu');

    const withEn = new NextRequest('http://localhost/api', {
      headers: { cookie: 'NEXT_LOCALE=en' },
    });
    expect(resolvePaymentRedirectLocaleFromRequest(withEn)).toBe('en');

    const none = new NextRequest('http://localhost/api');
    expect(resolvePaymentRedirectLocaleFromRequest(none)).toBe('hu');
  });

  it('resolvePaymentLocaleForServerAction prefers NextRequest cookies', async () => {
    const req = new NextRequest('http://localhost/api', {
      headers: { cookie: 'NEXT_LOCALE=de' },
    });
    await expect(resolvePaymentLocaleForServerAction(req)).resolves.toBe('de');
  });
});
