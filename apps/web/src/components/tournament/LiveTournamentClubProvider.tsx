"use client";

import { createContext, useContext, type ReactNode } from "react";

const LiveTournamentClubContext = createContext<string | undefined>(undefined);

export function LiveTournamentClubProvider({
  clubId,
  children,
}: {
  clubId: string;
  children: ReactNode;
}) {
  return (
    <LiveTournamentClubContext.Provider value={clubId}>{children}</LiveTournamentClubContext.Provider>
  );
}

export function useLiveTournamentClubId(): string | undefined {
  return useContext(LiveTournamentClubContext);
}
