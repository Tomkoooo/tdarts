export type MapSettingsLocale = 'hu' | 'en';

type MapSettingsTranslations = {
  mapPageTitle: string;
  mapPageDescription: string;
  mapHeroTitle: string;
  mapHeroSubtitle: string;
  mapSearchPlaceholder: string;
  mapSearchButton: string;
  mapLoadingButton: string;
  mapApiKeyMissing: string;
  mapLoadError: string;
  mapKindClub: string;
  mapKindTournament: string;
  mapEmpty: string;
  mapFilterAll: string;
  mapFilterClubs: string;
  mapFilterTournaments: string;
  mapNotGeocodedHint: string;
  geocodeStatusLabel: string;
  geocodeStatusOk: string;
  geocodeStatusPending: string;
  geocodeStatusNeedsReview: string;
  geocodeStatusFailed: string;
  geocodeStatusUnknown: string;
  geocodeLastUpdatedLabel: string;
  geocodeRequestButton: string;
  geocodeRequestingButton: string;
  geocodeRequestSuccess: string;
  geocodeRequestError: string;
  mapSectionsLabel: string;
  mapSectionGeneral: string;
  mapSectionBranding: string;
  mapSectionNews: string;
  mapSectionGallery: string;
  mapSectionMembers: string;
  mapSectionDanger: string;
  locationReviewClubMessage: string;
  locationReviewTournamentMessage: string;
  locationReviewAction: string;
};

const translations: Record<MapSettingsLocale, MapSettingsTranslations> = {
  hu: {
    mapPageTitle: 'Térkép',
    mapPageDescription: 'Klubok és közelgő tornák térképes nézete.',
    mapHeroTitle: 'Térkép nézet',
    mapHeroSubtitle: 'Közelgő versenyek és klubok térképen.',
    mapSearchPlaceholder: 'Keresés klubra vagy tornára...',
    mapSearchButton: 'Keresés',
    mapLoadingButton: 'Betöltés...',
    mapApiKeyMissing: 'A NEXT_PUBLIC_GOOGLE_MAPS_API_KEY nincs beállítva, ezért csak lista nézet érhető el.',
    mapLoadError: 'A térképes találatok betöltése sikertelen.',
    mapKindClub: 'Klub',
    mapKindTournament: 'Közelgő torna',
    mapEmpty: 'Nincs térképen megjeleníthető találat.',
    mapFilterAll: 'Mindkettő',
    mapFilterClubs: 'Csak klubok',
    mapFilterTournaments: 'Csak közelgő tornák',
    mapNotGeocodedHint: 'A listában látszik, de még nincs geokódolva térképre.',
    geocodeStatusLabel: 'Geokód állapot',
    geocodeStatusOk: 'Rendben',
    geocodeStatusPending: 'Folyamatban',
    geocodeStatusNeedsReview: 'Ellenőrzés szükséges',
    geocodeStatusFailed: 'Sikertelen',
    geocodeStatusUnknown: 'Ismeretlen',
    geocodeLastUpdatedLabel: 'Utolsó geokód frissítés',
    geocodeRequestButton: 'Geokód kérés',
    geocodeRequestingButton: 'Kérés folyamatban...',
    geocodeRequestSuccess: 'Geokód sikeresen frissítve.',
    geocodeRequestError: 'A geokód kérés sikertelen.',
    mapSectionsLabel: 'Szekciók',
    mapSectionGeneral: 'Alapadatok',
    mapSectionBranding: 'Megjelenés',
    mapSectionNews: 'Hírek',
    mapSectionGallery: 'Galéria',
    mapSectionMembers: 'Tagok',
    mapSectionDanger: 'Műveletek',
    locationReviewClubMessage: 'A klub címe ellenőrzést igényel a térképes megjelenítéshez.',
    locationReviewTournamentMessage: 'A torna címe ellenőrzést igényel a térképes megjelenítéshez.',
    locationReviewAction: 'Cím javítása',
  },
  en: {
    mapPageTitle: 'Map',
    mapPageDescription: 'Map view of clubs and upcoming tournaments.',
    mapHeroTitle: 'Map view',
    mapHeroSubtitle: 'Upcoming tournaments and clubs on the map.',
    mapSearchPlaceholder: 'Search clubs or tournaments...',
    mapSearchButton: 'Search',
    mapLoadingButton: 'Loading...',
    mapApiKeyMissing: 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured, list view is shown only.',
    mapLoadError: 'Failed to load map results.',
    mapKindClub: 'Club',
    mapKindTournament: 'Upcoming tournament',
    mapEmpty: 'No map-ready results found.',
    mapFilterAll: 'Both',
    mapFilterClubs: 'Clubs only',
    mapFilterTournaments: 'Upcoming tournaments only',
    mapNotGeocodedHint: 'Visible in list, but not geocoded for map yet.',
    geocodeStatusLabel: 'Geocode status',
    geocodeStatusOk: 'OK',
    geocodeStatusPending: 'Pending',
    geocodeStatusNeedsReview: 'Needs review',
    geocodeStatusFailed: 'Failed',
    geocodeStatusUnknown: 'Unknown',
    geocodeLastUpdatedLabel: 'Last geocode update',
    geocodeRequestButton: 'Request geocode',
    geocodeRequestingButton: 'Requesting...',
    geocodeRequestSuccess: 'Geocode updated successfully.',
    geocodeRequestError: 'Geocode request failed.',
    mapSectionsLabel: 'Sections',
    mapSectionGeneral: 'General',
    mapSectionBranding: 'Branding',
    mapSectionNews: 'News',
    mapSectionGallery: 'Gallery',
    mapSectionMembers: 'Members',
    mapSectionDanger: 'Actions',
    locationReviewClubMessage: 'Club address needs review for map display.',
    locationReviewTournamentMessage: 'Tournament address needs review for map display.',
    locationReviewAction: 'Fix address',
  },
};

export const getMapSettingsTranslations = (locale?: string): MapSettingsTranslations => {
  const normalized = (locale || '').toLowerCase();
  if (normalized.startsWith('en')) return translations.en;
  return translations.hu;
};
