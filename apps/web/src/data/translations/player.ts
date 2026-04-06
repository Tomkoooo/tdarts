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
  wins: string;
  losses: string;
  headToHeadFirstNineAvg: string;
  headToHeadWinrate: string;
  headToHeadScopeTournament: string;
  headToHeadScopeAllTime: string;
  topTournamentAverages: string;
  reset: string;
  notEnoughData: string;
  topTournamentAvg: string;
  topTournamentMatches: string;
  topMatchAverages: string;
  opponentResult: string;
  f9Avg: string;
  date: string;
  loadMore: string;
  currentMmr: string;
  endOfSeasonMmr: string;
  archived: string;
  rank: string;
  finishedPlace: string;
  globalList: string;
  tournaments: string;
  career: string;
  period: string;
  winRate: string;
  winCount: string;
  formAverage: string;
  noData: string;
  mmrProgression: string;
  noMmrHistory: string;
  seasonalStats: string;
  recentMatches: string;
  myTeams: string;
  eventLog: string;
  emptyList: string;
  openDetails: string;
  average: string;
  firstNine: string;
  oneEighties: string;
  bestPosition: string;
  avgPosition: string;
  maxCheckout: string;
  pair: string;
  team: string;
  matches: string;
  legs: string;
  honorAvgTooltip: string;
  honorBadgeTooltip: string;
  honorsSectionTitle: string;
  honorsCategorySpecial: string;
  honorsCategoryRank: string;
  honorsCategoryTournament: string;
  honorsEmptyTitle: string;
  honorsEmptySubtitle: string;
  honorsShowMore: string;
  honorsShowLess: string;
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
    wins: "Győzelem",
    losses: "Vereség",
    headToHeadFirstNineAvg: "First 9 Átlag",
    headToHeadWinrate: "Győzelmi ráta",
    headToHeadScopeTournament: "Torna",
    headToHeadScopeAllTime: "Összesített",
    topTournamentAverages: "Top Torna Átlagok",
    reset: "Reset",
    notEnoughData: "Nincs elég adat",
    topTournamentAvg: "Átlag",
    topTournamentMatches: "Meccsek",
    topMatchAverages: "Top Meccs Átlagok",
    opponentResult: "Ellenfél / Eredmény",
    f9Avg: "F9 Átlag",
    date: "Dátum",
    loadMore: "Több",
    currentMmr: "Aktuális MMR",
    endOfSeasonMmr: "Szezon végi MMR",
    archived: "Archivált",
    rank: "Rangsor",
    finishedPlace: "Végezte",
    globalList: "Globális lista",
    tournaments: "Tornák",
    career: "Pályafutás",
    period: "Időszak",
    winRate: "Győzelmi ráta",
    winCount: "Győzelem",
    formAverage: "Forma (Átlag)",
    noData: "Nincs adat",
    mmrProgression: "MMR Alakulás",
    noMmrHistory: "Nincs MMR történet",
    seasonalStats: "Szezonális Mutatók",
    recentMatches: "Legutóbbi Meccsek",
    myTeams: "Párosaim / Csapataim",
    eventLog: "Esemény Napló",
    emptyList: "Üres lista",
    openDetails: "Megnyitás",
    average: "Átlag",
    firstNine: "First 9 Átlag",
    oneEighties: "180-as Dobások",
    bestPosition: "Legjobb Helyezés",
    avgPosition: "Átlagos Helyezés",
    maxCheckout: "Max Kiszálló",
    pair: "Páros",
    team: "Csapat",
    matches: "Meccsek",
    legs: "Legek",
    honorAvgTooltip: "Utolsó 10 lezárt meccs átlaga: {avg}",
    honorBadgeTooltip: "{title} elismerés",
    honorsSectionTitle: "Elismerések és eredmények",
    honorsCategorySpecial: "Különleges elismerések",
    honorsCategoryRank: "Rangsor eredmények",
    honorsCategoryTournament: "Verseny eredmények",
    honorsEmptyTitle: "Még nincsenek elismerések",
    honorsEmptySubtitle: "Az első kiemelkedő eredmények itt fognak megjelenni.",
    honorsShowMore: "Továbbiak",
    honorsShowLess: "Kevesebb",
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
    wins: "Wins",
    losses: "Losses",
    headToHeadFirstNineAvg: "First 9 Avg",
    headToHeadWinrate: "Winrate",
    headToHeadScopeTournament: "Tournament",
    headToHeadScopeAllTime: "All-time",
    topTournamentAverages: "Top Tournament Averages",
    reset: "Reset",
    notEnoughData: "Not enough data",
    topTournamentAvg: "Average",
    topTournamentMatches: "Matches",
    topMatchAverages: "Top Match Averages",
    opponentResult: "Opponent / Result",
    f9Avg: "F9 Avg",
    date: "Date",
    loadMore: "Load more",
    currentMmr: "Current MMR",
    endOfSeasonMmr: "End of Season MMR",
    archived: "Archived",
    rank: "Rank",
    finishedPlace: "Finished",
    globalList: "Global list",
    tournaments: "Tournaments",
    career: "Career",
    period: "Period",
    winRate: "Win rate",
    winCount: "Wins",
    formAverage: "Form (Average)",
    noData: "No data",
    mmrProgression: "MMR Progression",
    noMmrHistory: "No MMR history",
    seasonalStats: "Seasonal Stats",
    recentMatches: "Recent Matches",
    myTeams: "My Pairs / Teams",
    eventLog: "Event Log",
    emptyList: "Empty list",
    openDetails: "Open",
    average: "Average",
    firstNine: "First 9 Avg",
    oneEighties: "180s Hit",
    bestPosition: "Best Position",
    avgPosition: "Average Position",
    maxCheckout: "Max Checkout",
    pair: "Pair",
    team: "Team",
    matches: "Matches",
    legs: "Legs",
    honorAvgTooltip: "Last 10 closed matches average: {avg}",
    honorBadgeTooltip: "{title} honor",
    honorsSectionTitle: "Honors & Achievements",
    honorsCategorySpecial: "Special Honors",
    honorsCategoryRank: "Ranking Achievements",
    honorsCategoryTournament: "Tournament Wins",
    honorsEmptyTitle: "No honors yet",
    honorsEmptySubtitle: "Top achievements will appear here once earned.",
    honorsShowMore: "Show more",
    honorsShowLess: "Show less",
  },
};

export function getPlayerTranslations(locale?: string): PlayerTranslations {
  const normalized = (locale || "").toLowerCase();
  if (normalized.startsWith("en")) return translations.en;
  return translations.hu;
}
