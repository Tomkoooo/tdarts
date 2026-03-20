"use client";

import { useCallback, useEffect, useState } from "react";
import type { SimplifiedUser } from "@/hooks/useUser";
import {
  getTournamentPageDataAction,
  getTournamentPageLiteAction,
} from "@/features/tournaments/actions/getTournamentPageData.action";
import type { SseDeltaPayload } from "@/lib/events";
import { extractTournamentPayload } from "@/features/tournament/lib/tournamentPageData";

type UserClubRole = "admin" | "moderator" | "member" | "none";
type UserPlayerStatus = "applied" | "checked-in" | "none";
const SSE_DEBUG = process.env.NEXT_PUBLIC_SSE_DEBUG === "true";

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
  errorMessage: string,
  initialData?: any
) {
  const [tournament, setTournament] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userClubRole, setUserClubRole] = useState<UserClubRole>("none");
  const [userPlayerStatus, setUserPlayerStatus] =
    useState<UserPlayerStatus>("none");
  const [userPlayerId, setUserPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [hasFullData, setHasFullData] = useState(false);

  const setters = {
    setUserClubRole,
    setUserPlayerStatus,
    setUserPlayerId,
  };

  const fetchAll = useCallback(async (detailLevel: "overview" | "full" = "overview") => {
    if (!code || typeof code !== "string") return;
    setLoading(true);
    setError("");

    try {
      const data = await getTournamentPageDataAction({
        code,
        includeViewer: Boolean(user?._id),
        detailLevel,
      });
      const payload = extractTournamentPayload(data);
      if (!payload) {
        throw new Error("Tournament not found");
      }
      setTournament(payload.tournament);
      setPlayers(payload.players);
      setHasFullData(detailLevel === "full");

      applyTournamentData(
        { ...payload.tournament, viewer: payload.viewer },
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

  const ensureFullData = useCallback(async () => {
    if (!code || typeof code !== "string") return;
    if (hasFullData) return;
    await fetchAll("full");
  }, [code, fetchAll, hasFullData]);

  const silentRefresh = useCallback(async () => {
    if (!code || typeof code !== "string") return;

    try {
      const data = await getTournamentPageLiteAction({ code, bypassCache: true });
      const tournamentLite = (data as { tournament?: any })?.tournament;
      if (!tournamentLite) {
        return;
      }

      setTournament((prev: any) => {
        if (!prev) return tournamentLite;
        return {
          ...prev,
          ...tournamentLite,
          tournamentSettings: {
            ...(prev.tournamentSettings || {}),
            ...(tournamentLite.tournamentSettings || {}),
          },
          boards: Array.isArray(tournamentLite.boards) ? tournamentLite.boards : prev.boards,
        };
      });
    } catch (err) {
      console.error("Silent refresh failed", err);
    }
  }, [code]);

  const resyncFullData = useCallback(async () => {
    if (!code || typeof code !== "string") return;
    try {
      if (SSE_DEBUG) {
        console.log("[SSE][TournamentPageData] resyncFullData:start", { code });
      }
      const data = await getTournamentPageDataAction({
        code,
        includeViewer: Boolean(user?._id),
        detailLevel: "full",
        bypassCache: true,
      });
      const tournamentData = (data as { tournament?: any })?.tournament;
      if (!tournamentData) return;
      setTournament(tournamentData);
      setPlayers(
        Array.isArray(tournamentData.tournamentPlayers)
          ? tournamentData.tournamentPlayers
          : []
      );
      setHasFullData(true);
      if (SSE_DEBUG) {
        console.log("[SSE][TournamentPageData] resyncFullData:done", {
          code,
          hasKnockout: Array.isArray(tournamentData.knockout),
          groups: Array.isArray(tournamentData.groups) ? tournamentData.groups.length : 0,
          boards: Array.isArray(tournamentData.boards) ? tournamentData.boards.length : 0,
        });
      }
    } catch (err) {
      console.error("Full resync failed", err);
    }
  }, [code, user?._id]);

  const applySseDelta = useCallback((delta: SseDeltaPayload<any>) => {
    if (!delta || delta.kind !== "delta" || delta.schemaVersion !== 1) {
      return false;
    }

    const canApply =
      (delta.scope === "board" && Boolean(delta.data?.board)) ||
      (delta.scope === "match" && Boolean(delta.data?.match?._id)) ||
      (delta.scope === "tournament" &&
        delta.action === "updated" &&
        Boolean(delta.data?.tournamentPatch));
    if (!canApply) return false;

    let applied = false;
    let forceResync = false;
    setTournament((prev: any) => {
      if (!prev) return prev;
      const next = { ...prev };

      if (delta.scope === "board") {
        const boardPatch = delta.data?.board;
        if (boardPatch && Array.isArray(next.boards)) {
          let boardFound = false;
          next.boards = next.boards.map((board: any) =>
            board?.boardNumber === boardPatch?.boardNumber
              ? (() => {
                  boardFound = true;
                  return { ...board, ...boardPatch };
                })()
              : board
          );
          applied = boardFound;
        }
        return next;
      }

      if (delta.scope === "match") {
        const incomingMatch = delta.data?.match;
        if (!incomingMatch?._id) return next;
        const incomingId = String(incomingMatch._id);
        let matchFound = false;
        let boardFound = false;

        if (Array.isArray(next.matches)) {
          next.matches = next.matches.map((match: any) =>
            String(match?._id) === incomingId
              ? (() => {
                  matchFound = true;
                  return { ...match, ...incomingMatch };
                })()
              : match
          );
        }

        if (Array.isArray(next.groups)) {
          next.groups = next.groups.map((group: any) => {
            if (!Array.isArray(group?.matches)) return group;
            const matches = group.matches.map((match: any) =>
              String(match?._id) === incomingId
                ? (() => {
                    matchFound = true;
                    return { ...match, ...incomingMatch };
                  })()
                : match
            );
            return { ...group, matches };
          });
        }

        if (Array.isArray(next.boards)) {
          const boardNumber = delta.data?.boardNumber;
          if (typeof boardNumber === "number") {
            const incomingMatchId = incomingMatch?._id
              ? String(incomingMatch._id)
              : undefined;
            next.boards = next.boards.map((board: any) => {
              if (board?.boardNumber !== boardNumber) return board;
              boardFound = true;
              return {
                ...board,
                status:
                  delta.action === "started"
                    ? "playing"
                    : delta.action === "finished"
                      ? "waiting"
                      : board.status,
                currentMatch:
                  delta.action === "started"
                    ? incomingMatchId || board.currentMatch
                    : delta.action === "finished"
                      ? undefined
                      : board.currentMatch,
                nextMatch:
                  delta.action === "finished" && delta.data?.nextMatch
                    ? delta.data.nextMatch
                    : board.nextMatch,
              };
            });
          }
        }
        applied = matchFound || boardFound;
        if (delta.action === "finished") {
          // Board nextMatch/queue transitions require canonical backend snapshot.
          forceResync = true;
        }
      }

      if (delta.scope === "tournament" && delta.action === "updated") {
        const patch = delta.data?.tournamentPatch;
        if (patch && typeof patch === "object") {
          Object.assign(next, patch);
          applied = true;
        }
      }

      return next;
    });

    const finalApplied = applied && !forceResync;
    if (SSE_DEBUG) {
      console.log("[SSE][TournamentPageData] applyDelta", {
        code,
        scope: delta.scope,
        action: delta.action,
        tournamentId: delta.tournamentId,
        applied,
        forceResync,
        finalApplied,
      });
    }
    return finalApplied;
  }, []);

  useEffect(() => {
    const payload = extractTournamentPayload(initialData);
    if (payload) {
      setTournament(payload.tournament);
      setPlayers(payload.players);
      setHasFullData(false);
      applyTournamentData(
        { ...payload.tournament, viewer: payload.viewer },
        user?._id,
        String(code || ""),
        setters
      );
      return;
    }
    fetchAll("overview");
  }, [code, fetchAll, initialData, user?._id]);

  return {
    tournament,
    players,
    loading,
    error,
    userClubRole,
    userPlayerStatus,
    userPlayerId,
    hasFullData,
    fetchAll,
    ensureFullData,
    silentRefresh,
    applySseDelta,
    resyncFullData,
  };
}
