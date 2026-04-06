type ViewerPayload = {
  userClubRole?: string;
  userPlayerStatus?: string;
};

const DEFAULT_VIEWER: Required<ViewerPayload> = {
  userClubRole: "none",
  userPlayerStatus: "none",
};

export function extractTournamentPayload(data: any): {
  tournament: any;
  players: any[];
  viewer: Required<ViewerPayload>;
} | null {
  const tournament = data?.tournament;
  if (!tournament) {
    return null;
  }

  const viewer: ViewerPayload = tournament?.viewer || data?.viewer || DEFAULT_VIEWER;
  return {
    tournament,
    players: Array.isArray(tournament.tournamentPlayers)
      ? tournament.tournamentPlayers
      : [],
    viewer: {
      userClubRole: viewer.userClubRole || "none",
      userPlayerStatus: viewer.userPlayerStatus || "none",
    },
  };
}
