import { getBaseUrl } from './seo';

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

export const buildClubMetadataValues = (club: ClubSeoInput) => {
  const name = club.name || 'Darts Klub';
  const title = club.landingPage?.seo?.title || name;
  const description =
    club.landingPage?.seo?.description || club.description || `Részletek a(z) ${name} darts klubról.`;
  const commonKeywords = [name, club.location, 'darts', 'tornák', 'klub'].filter(Boolean);
  const keywords = club.landingPage?.seo?.keywords || commonKeywords.join(', ');
  const image = club.landingPage?.coverImage || club.landingPage?.logo || club.logo || '/images/club-default-cover.jpg';
  const imageUrl = image.startsWith('http') ? image : `${getBaseUrl()}${image}`;
  const location = club.address || club.location || 'Magyarország';
  const clubId = (typeof club._id === 'string' ? club._id : club._id?.toString()) || club.code;
  const canonicalUrl = `${getBaseUrl()}/clubs/${clubId}`;
  const memberCount = club.members?.length || 0;

  return { name, title, description, keywords, imageUrl, location, canonicalUrl, memberCount };
};
