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
    coverImage?: string;
    logo?: string;
  };
  logo?: string;
}

export const buildClubMetadataValues = (club: ClubSeoInput, locale: SupportedLocale = 'hu') => {
  const base = getBaseUrl().replace(/\/$/, '');
  const name = club.name || 'Darts Klub';
  const title = club.landingPage?.seo?.title || name;
  const description =
    club.landingPage?.seo?.description || club.description || `Részletek a(z) ${name} darts klubról.`;
  const commonKeywords = [name, club.location, 'darts', 'tornák', 'klub'].filter(Boolean);
  const keywords = club.landingPage?.seo?.keywords || commonKeywords.join(', ');
  const imagePath = pickClubOgImagePath(club);
  const imageUrl = toAbsoluteImageUrl(imagePath, base);
  const location = club.address || club.location || 'Magyarország';
  const clubId = (typeof club._id === 'string' ? club._id : club._id?.toString()) || club.code;
  const canonicalUrl = `${base}${localePath(`/clubs/${clubId}`, locale)}`;
  const memberCount = club.members?.length || 0;

  return { name, title, description, keywords, imageUrl, location, canonicalUrl, memberCount };
};
