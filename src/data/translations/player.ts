export type PlayerLocale = "hu" | "en";

type PlayerTranslations = {
  headToHeadTitle: string;
  headToHeadSearchPlaceholder: string;
  headToHeadLoading: string;
  headToHeadNoSelection: string;
  headToHeadNoMatches: string;
  headToHeadFetchError: string;
  headToHeadMatches: string;
  headToHeadWins: string;
  headToHeadLegsWon: string;
  headToHeadAverage: string;
  headToHeadHighestCheckout: string;
  headToHeadOneEighties: string;
  headToHeadReview: string;
  headToHeadTopOpponents: string;
  headToHeadNoTopOpponents: string;
  headToHeadStatsMine: string;
  headToHeadStatsOpponent: string;
  headToHeadStatsMetric: string;
  headToHeadPlayed: string;
  headToHeadLost: string;
  headToHeadClear: string;
  headToHeadOpenTournament: string;
  headToHeadUnknownOpponent: string;
  pendingInvitesTitle: string;
  pendingInvitesEmpty: string;
  pendingInvitesLoading: string;
  pendingInvitesFrom: string;
  pendingInvitesRecipient: string;
  pendingInvitesOpen: string;
  pendingInvitesToast: string;
  pendingInvitesToastOpen: string;
  pendingInvitesToastLater: string;
  pendingInvitesTypeEmail: string;
  pendingInvitesTypeAccount: string;
  viewHeadToHead: string;
  retry: string;
};

const translations: Record<PlayerLocale, PlayerTranslations> = {
  hu: {
    headToHeadTitle: "Head-to-Head",
    headToHeadSearchPlaceholder: "Ellenfél keresése...",
    headToHeadLoading: "Head-to-head adatok betöltése...",
    headToHeadNoSelection: "Válassz egy játékost a head-to-head statisztikákhoz.",
    headToHeadNoMatches: "Még nincs közös meccs.",
    headToHeadFetchError: "Nem sikerült betölteni a head-to-head adatokat.",
    headToHeadMatches: "Meccsek",
    headToHeadWins: "Győzelmek",
    headToHeadLegsWon: "Nyert legek",
    headToHeadAverage: "Átlag",
    headToHeadHighestCheckout: "Legjobb kiszálló",
    headToHeadOneEighties: "180-ak",
    headToHeadReview: "Megtekintés",
    headToHeadTopOpponents: "Legtöbbet játszott ellenfelek",
    headToHeadNoTopOpponents: "Még nincs elég meccs az ajánláshoz.",
    headToHeadStatsMine: "Én",
    headToHeadStatsOpponent: "Ellenfél",
    headToHeadStatsMetric: "Mutató",
    headToHeadPlayed: "Lejátszott",
    headToHeadLost: "Vereség",
    headToHeadClear: "Törlés",
    headToHeadOpenTournament: "Torna megnyitása",
    headToHeadUnknownOpponent: "Ellenfél kiválasztása",
    pendingInvitesTitle: "Függő meghívók",
    pendingInvitesEmpty: "Nincs függő meghívód.",
    pendingInvitesLoading: "Meghívók betöltése...",
    pendingInvitesFrom: "Meghívó:",
    pendingInvitesRecipient: "Címzett email:",
    pendingInvitesOpen: "Megnyitás",
    pendingInvitesToast: "Függő csapatmeghívásod van.",
    pendingInvitesToastOpen: "Megnyitás",
    pendingInvitesToastLater: "Később",
    pendingInvitesTypeEmail: "E-mailes meghívó",
    pendingInvitesTypeAccount: "Regisztrált fiók",
    viewHeadToHead: "Head-to-Head",
    retry: "Újrapróbálás",
  },
  en: {
    headToHeadTitle: "Head-to-Head",
    headToHeadSearchPlaceholder: "Search opponent...",
    headToHeadLoading: "Loading head-to-head...",
    headToHeadNoSelection: "Select a player to view head-to-head statistics.",
    headToHeadNoMatches: "No shared matches yet.",
    headToHeadFetchError: "Failed to load head-to-head data.",
    headToHeadMatches: "Matches",
    headToHeadWins: "Wins",
    headToHeadLegsWon: "Legs won",
    headToHeadAverage: "Average",
    headToHeadHighestCheckout: "Highest checkout",
    headToHeadOneEighties: "180s",
    headToHeadReview: "Review",
    headToHeadTopOpponents: "Most played opponents",
    headToHeadNoTopOpponents: "Not enough matches for suggestions yet.",
    headToHeadStatsMine: "Me",
    headToHeadStatsOpponent: "Opponent",
    headToHeadStatsMetric: "Metric",
    headToHeadPlayed: "Played",
    headToHeadLost: "Lost",
    headToHeadClear: "Clear",
    headToHeadOpenTournament: "Open tournament",
    headToHeadUnknownOpponent: "Select opponent",
    pendingInvitesTitle: "Pending invites",
    pendingInvitesEmpty: "You have no pending invites.",
    pendingInvitesLoading: "Loading invites...",
    pendingInvitesFrom: "Invited by:",
    pendingInvitesRecipient: "Recipient email:",
    pendingInvitesOpen: "Open",
    pendingInvitesToast: "You have pending team invitations.",
    pendingInvitesToastOpen: "Open",
    pendingInvitesToastLater: "Later",
    pendingInvitesTypeEmail: "Email invite",
    pendingInvitesTypeAccount: "Registered account",
    viewHeadToHead: "Head-to-Head",
    retry: "Retry",
  },
};

export function getPlayerTranslations(locale?: string): PlayerTranslations {
  const normalized = (locale || "").toLowerCase();
  if (normalized.startsWith("en")) return translations.en;
  return translations.hu;
}
