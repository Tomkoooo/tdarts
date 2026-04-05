import { getBaseUrl, localePath, type SupportedLocale } from '@/lib/seo';

type ClubJsonLdProps = {
  locale: SupportedLocale;
  clubId: string;
  name: string;
  description?: string | null;
  location?: string | null;
};

/**
 * JSON-LD for public club pages — helps search engines associate the club entity with tDarts.
 */
export function ClubJsonLd({ locale, clubId, name, description, location }: ClubJsonLdProps) {
  const base = getBaseUrl().replace(/\/$/, '');
  const url = `${base}${localePath(`/clubs/${clubId}`, locale)}`;
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsClub',
    name,
    url,
    sport: 'Darts',
    isPartOf: {
      '@type': 'WebSite',
      name: 'tDarts',
      url: base,
    },
  };
  const d = description?.trim();
  if (d) jsonLd.description = d;
  const loc = location?.trim();
  if (loc) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      addressLocality: loc,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
