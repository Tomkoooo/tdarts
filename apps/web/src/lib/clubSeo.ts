import { getBaseUrl, localePath, type SupportedLocale } from './seo';
import { pickClubOgImagePath, toAbsoluteImageUrl } from './og-image';

interface ClubSeoInput {
  _id?: string | { toString(): string };
  code: string;
  name?: string;
  description?: string;
  location?: string;
  address?: string;
  members?: Array<unknown>;
  landingPage?: {
    seo?: { title?: string; description?: string; keywords?: string };
    aboutText?: string;
    coverImage?: string;
    logo?: string;
  };
  logo?: string;
}

const stripHtmlToText = (value?: string): string => {
  if (!value) return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

const truncateForDescription = (value: string, maxLength = 200): string => {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

export const buildClubMetadataValues = (club: ClubSeoInput, locale: SupportedLocale = 'hu') => {
  const base = getBaseUrl().replace(/\/$/, '');
  const name = club.name || 'Darts Klub';
  const title = club.landingPage?.seo?.title || name;
  const aboutTextFallback = truncateForDescription(stripHtmlToText(club.landingPage?.aboutText));
  const description =
    club.landingPage?.seo?.description ||
    aboutTextFallback ||
    club.description ||
    `Részletek a(z) ${name} darts klubról.`;
  const commonKeywords = [name, club.location, 'darts', 'tornák', 'klub'].filter(Boolean);
  const keywords = club.landingPage?.seo?.keywords || commonKeywords.join(', ');
  const imagePath = pickClubOgImagePath(club);
  const imageUrl = toAbsoluteImageUrl(imagePath, base);
  const location = club.address || club.location || 'Magyarország';
  const clubPathToken = club.code || (typeof club._id === 'string' ? club._id : club._id?.toString()) || '';
  const canonicalUrl = `${base}${localePath(`/clubs/${clubPathToken}`, locale)}`;
  const memberCount = club.members?.length || 0;

  return { name, title, description, keywords, imageUrl, location, canonicalUrl, memberCount };
};
