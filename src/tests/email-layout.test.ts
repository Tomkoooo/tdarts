import {
  normalizeEmailLocale,
  renderMinimalEmailLayout,
  textToEmailHtml,
} from '@/lib/email-layout';

describe('email-layout helpers', () => {
  it('normalizes locales with fallback', () => {
    expect(normalizeEmailLocale('en-US')).toBe('en');
    expect(normalizeEmailLocale('de-DE')).toBe('de');
    expect(normalizeEmailLocale('hu-HU')).toBe('hu');
    expect(normalizeEmailLocale(undefined)).toBe('hu');
  });

  it('converts text to safe html line breaks', () => {
    const html = textToEmailHtml('Line 1\nLine <2>');
    expect(html).toContain('Line 1<br>');
    expect(html).toContain('Line &lt;2&gt;');
  });

  it('renders shared minimalist layout with localized footer', () => {
    const huHtml = renderMinimalEmailLayout({
      locale: 'hu',
      title: 'HU Test',
      bodyHtml: '<p>Body</p>',
    });
    const enHtml = renderMinimalEmailLayout({
      locale: 'en',
      title: 'EN Test',
      bodyHtml: '<p>Body</p>',
    });

    expect(huHtml).toContain('lang="hu"');
    expect(huHtml).toContain('Ezt az üzenetet a tDarts rendszer küldte automatikusan.');
    expect(enHtml).toContain('lang="en"');
    expect(enHtml).toContain('This message was sent automatically by the tDarts platform.');
  });
});
