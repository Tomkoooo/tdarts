"use client";

import { useCallback, useEffect, useState } from "react";
import type { SimplifiedUser } from "@/hooks/useUser";
import { getTournamentPageDataAction } from "@/features/tournaments/actions/getTournamentPageData.action";

type UserClubRole = "admin" | "moderator" | "member" | "none";
type UserPlayerStatus = "applied" | "checked-in" | "none";

function findUserInPlayers(
  list: any[],
  userId: string
): { player: any; playerId: string | null } | null {
  const userPlayer = list.find((p: any) => {
    const playerRef = p.playerReference;
    if (!playerRef) return false;
    if (playerRef.userRef === userId || playerRef._id?.toString() === userId)
      return true;
    if (playerRef.members && Array.isArray(playerRef.members)) {
      return playerRef.members.some(
        (m: any) =>
          m.userRef === userId ||
          m._id?.toString() === userId ||
          (typeof m.userRef === "object" &&
            m.userRef?._id?.toString() === userId)
      );
    }
    return false;
  });
  if (!userPlayer) return null;
  const playerId =
    userPlayer.playerReference?._id || userPlayer.playerReference || null;
  return { player: userPlayer, playerId };
}

function applyTournamentData(
  tournamentData: any,
  userId: string | undefined,
  code: string,
  setters: {
    setUserClubRole: (r: UserClubRole) => void;
    setUserPlayerStatus: (s: UserPlayerStatus) => void;
    setUserPlayerId: (id: string | null) => void;
  }
) {
  if (!userId) {
    setters.setUserClubRole("none");
    setters.setUserPlayerStatus("none");
    setters.setUserPlayerId(null);
    return;
  }

  const roleData = tournamentData?.viewer || null;
  if (!roleData) {
    return; // Caller must fetch role separately
  }

  setters.setUserClubRole(roleData.userClubRole || "none");
  setters.setUserPlayerStatus(roleData.userPlayerStatus || "none");

  let result = findUserInPlayers(
    tournamentData.tournamentPlayers || [],
    userId
  );
  if (!result) {
    const waitlist = tournamentData.waitingList || [];
    const waitResult = findUserInPlayers(waitlist, userId);
    if (waitResult) {
      result = waitResult;
      if (roleData.userPlayerStatus === "none") {
        setters.setUserPlayerStatus("applied");
      }
    }
  }
  if (result) {
    setters.setUserPlayerId(result.playerId);
    if (roleData.userPlayerStatus === "none") {
      setters.setUserPlayerStatus("applied");
    }
  } else {
    setters.setUserPlayerId(null);
  }
}

export function useTournamentPageData(
  code: string | string[] | undefined,
  user: SimplifiedUser | undefined,
  errorMessage: string
) {
  const [tournament, setTournament] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userClubRole, setUserClubRole] = useState<UserClubRole>("none");
  const [userPlayerStatus, setUserPlayerStatus] =
    useState<UserPlayerStatus>("none");
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);

  const setters = {
    setUserClubRole,
    setUserPlayerStatus,
    setUserPlayerId,
  };

  const fetchAll = useCallback(async () => {
    if (!code || typeof code !== "string") return;
    setLoading(true);
    setError("");

    try {
      const data = await getTournamentPageDataAction({
        code,
        includeViewer: Boolean(user?._id),
      });
      const tournamentData = (data as { tournament?: any })?.tournament;
      if (!tournamentData) {
        throw new Error("Tournament not found");
      }

      setTournament(tournamentData);
      setPlayers(
        Array.isArray(tournamentData.tournamentPlayers)
          ? tournamentData.tournamentPlayers
          : []
      );

      const roleData = tournamentData?.viewer || (data as { viewer?: any })?.viewer || { userClubRole: "none", userPlayerStatus: "none" };

      applyTournamentData(
        { ...tournamentData, viewer: roleData },
        user?._id,
        code,
        setters
      );
    } catch (err: any) {
      console.error("Tournament fetch error:", err);
      setError(err.response?.data?.error || errorMessage);
    } finally {
      setLoading(false);
    }
  }, [code, user?._id, errorMessage]);

  const silentRefresh = useCallback(async () => {
    if (!code || typeof code !== "string") return;

    try {
      const data = await getTournamentPageDataAction({
        code,
        includeViewer: Boolean(user?._id),
      });
      const tournamentData = (data as { tournament?: any })?.tournament;
      if (!tournamentData) {
        return;
      }

      setTournament(tournamentData);
      setPlayers(
        Array.isArray(tournamentData.tournamentPlayers)
          ? tournamentData.tournamentPlayers
          : []
      );

      const roleData = tournamentData?.viewer || (data as { viewer?: any })?.viewer || { userClubRole: "none", userPlayerStatus: "none" };

      applyTournamentData(
        { ...tournamentData, viewer: roleData },
        user?._id,
        code,
        setters
      );
    } catch (err) {
      console.error("Silent refresh failed", err);
    }
  }, [code, user?._id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    tournament,
    players,
    loading,
    error,
    userClubRole,
    userPlayerStatus,
    userPlayerId,
    fetchAll,
    silentRefresh,
  };
}
