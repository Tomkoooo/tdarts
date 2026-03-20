"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SimplifiedUser } from "@/hooks/useUser";
import {
  getTournamentPageDataAction,
  getTournamentPageLiteAction,
} from "@/features/tournaments/actions/getTournamentPageData.action";
import type { SseDeltaPayload } from "@/lib/events";
import { extractTournamentPayload } from "@/features/tournament/lib/tournamentPageData";
import { perfFlags } from "@/features/performance/lib/perfFlags";

type UserClubRole = "admin" | "moderator" | "member" | "none";
type UserPlayerStatus = "applied" | "checked-in" | "none";
type TournamentView = "overview" | "players" | "boards" | "groups" | "bracket" | "full";
type TournamentSection = "overview" | "players" | "boards" | "groups" | "bracket";
type PrefetchedSectionMap = Partial<Record<Exclude<TournamentView, "full">, any>>;
const SSE_DEBUG = process.env.NEXT_PUBLIC_SSE_DEBUG === "true";

const hasPlayerStatusData = (list: any[]): boolean =>
  Array.isArray(list) &&
  list.length > 0 &&
  list.every((player: any) => typeof player?.status === "string" && player.status.length > 0);

const toNumericBoardNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const mergeIntoMatchReference = (existing: any, incoming: any) => {
  if (!incoming) return existing;
  if (existing?.matchReference) {
    return {
      ...existing,
      matchReference: {
        ...(existing.matchReference || {}),
        ...incoming,
      },
    };
  }
  return {
    ...(existing || {}),
    ...incoming,
  };
};

function mergeTournamentByView(prev: any, next: any, view: TournamentView) {
  if (!prev || view === "overview" || view === "full") {
    return next;
  }

  const merged = {
    ...prev,
    ...next,
    tournamentSettings: {
      ...(prev.tournamentSettings || {}),
      ...(next.tournamentSettings || {}),
    },
  };

  if (view === "players") {
    merged.tournamentPlayers = next.tournamentPlayers ?? prev.tournamentPlayers;
    merged.waitingList = next.waitingList ?? prev.waitingList;
  }
  if (view === "boards") {
    merged.boards = next.boards ?? prev.boards;
  }
  if (view === "groups") {
    merged.groups = next.groups ?? prev.groups;
    merged.tournamentPlayers = next.tournamentPlayers ?? prev.tournamentPlayers;
  }
  if (view === "bracket") {
    merged.knockout = next.knockout ?? prev.knockout;
    merged.tournamentPlayers = next.tournamentPlayers ?? prev.tournamentPlayers;
  }

  return merged;
}

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
  initialData?: any,
  initialSections?: PrefetchedSectionMap
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
  const currentViewRef = useRef<TournamentView>("overview");
  const initialDataHydratedCodeRef = useRef<string | null>(null);
  const [lastLoadedSection, setLastLoadedSection] = useState<
    "overview" | "players" | "boards" | "groups" | "bracket"
  >("overview");

  const setters = {
    setUserClubRole,
    setUserPlayerStatus,
    setUserPlayerId,
  };

  const applySectionPayload = useCallback(
    (view: TournamentSection, payload: NonNullable<ReturnType<typeof extractTournamentPayload>>) => {
      setTournament((prev: any) => mergeTournamentByView(prev, payload.tournament, view));
      setPlayers((prev: any[]) => {
        const incomingPlayers = payload.players;
        if (view === "players" || view === "groups" || view === "bracket") {
          return incomingPlayers.length > 0 ? incomingPlayers : prev;
        }
        if (view === "overview") {
          if (hasPlayerStatusData(incomingPlayers)) {
            return incomingPlayers;
          }
          return prev;
        }
        return incomingPlayers.length > 0 ? incomingPlayers : prev;
      });
      setLastLoadedSection(view);
    },
    []
  );

  const fetchAll = useCallback(async (
    view: TournamentView = "overview",
    options?: { bypassCache?: boolean }
  ) => {
    if (!code || typeof code !== "string") return;
    currentViewRef.current = view;
    const section =
      view === "players" ||
      view === "boards" ||
      view === "groups" ||
      view === "bracket"
        ? view
        : "overview";
    setLoading(true);
    setError("");

    try {
      const data = await getTournamentPageDataAction({
        code,
        includeViewer: Boolean(user?._id),
        view,
        bypassCache: options?.bypassCache ?? true,
        freshness: options?.bypassCache === false ? "default" : "force-fresh",
      });
      const payload = extractTournamentPayload(data);
      if (!payload) {
        throw new Error("Tournament not found");
      }
      if (view === "full") {
        setTournament(payload.tournament);
        setPlayers(payload.players);
      } else {
        applySectionPayload(view, payload);
      }
      setHasFullData(view === "full");
      setLastLoadedSection(section);

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
  }, [code, user?._id, errorMessage, applySectionPayload]);

  const resyncLiteData = useCallback(async (options?: { bypassCache?: boolean }) => {
    if (!code || typeof code !== "string") return false;

    try {
      const data = await getTournamentPageLiteAction({
        code,
        bypassCache: options?.bypassCache ?? true,
        freshness: options?.bypassCache === false ? "default" : "force-fresh",
      });
      const tournamentLite = (data as { tournament?: any })?.tournament;
      if (!tournamentLite) {
        return false;
      }

      setTournament((prev: any) => {
        if (!prev) return tournamentLite;
        const previousBoards = Array.isArray(prev.boards) ? prev.boards : [];
        const liteBoards = Array.isArray(tournamentLite.boards) ? tournamentLite.boards : [];
        const mergedBoards = previousBoards.map((board: any) => {
          const liteBoard = liteBoards.find(
            (candidate: any) => Number(candidate?.boardNumber) === Number(board?.boardNumber),
          );
          if (!liteBoard) return board;
          // Keep match references from full/tab payloads while accepting fresh status from lite payload.
          return {
            ...board,
            ...liteBoard,
            currentMatch: board?.currentMatch,
            nextMatch: board?.nextMatch,
          };
        });
        return {
          ...prev,
          ...tournamentLite,
          tournamentSettings: {
            ...(prev.tournamentSettings || {}),
            ...(tournamentLite.tournamentSettings || {}),
          },
          boards: mergedBoards.length > 0 ? mergedBoards : previousBoards,
        };
      });
      return true;
    } catch (err) {
      console.error("Silent refresh failed", err);
      return false;
    }
  }, [code]);

  const resyncFullData = useCallback(async (options?: { bypassCache?: boolean }) => {
    if (!code || typeof code !== "string") return;
    try {
      if (SSE_DEBUG) {
        console.log("[SSE][TournamentPageData] resyncFullData:start", { code });
      }
      const view = currentViewRef.current;
      const section =
        view === "players" ||
        view === "boards" ||
        view === "groups" ||
        view === "bracket"
          ? view
          : lastLoadedSection;
      if (perfFlags.realtimeLiteFirst) {
        await resyncLiteData({ bypassCache: true });
      }
      const data = await getTournamentPageDataAction({
        code,
        includeViewer: Boolean(user?._id),
        view,
        bypassCache: options?.bypassCache ?? true,
        freshness: options?.bypassCache === false ? "default" : "force-fresh",
      });
      const payload = extractTournamentPayload(data);
      if (!payload) return;
      setTournament(payload.tournament);
      setPlayers(payload.players);
      setHasFullData(true);
      setLastLoadedSection(section);
      if (SSE_DEBUG) {
        console.log("[SSE][TournamentPageData] resyncFullData:done", {
          code,
          hasKnockout: Array.isArray(payload.tournament.knockout),
          groups: Array.isArray(payload.tournament.groups) ? payload.tournament.groups.length : 0,
          boards: Array.isArray(payload.tournament.boards) ? payload.tournament.boards.length : 0,
        });
      }
    } catch (err) {
      console.error("Full resync failed", err);
    }
  }, [code, user?._id, lastLoadedSection, resyncLiteData]);

  const silentRefresh = useCallback(async () => {
    await resyncLiteData();
  }, [resyncLiteData]);

  const applySseDelta = useCallback((delta: SseDeltaPayload<any>) => {
    if (!delta || delta.kind !== "delta" || delta.schemaVersion !== 1) {
      return false;
    }

    const canApply =
      (delta.scope === "board" && Boolean(delta.data?.board)) ||
      (delta.scope === "match" &&
        (Boolean(delta.data?.match?._id) || Boolean(delta.data?.matchId))) ||
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
        const incomingIdRaw = incomingMatch?._id ?? delta.data?.matchId;
        if (!incomingIdRaw) return next;
        const incomingId = String(incomingIdRaw);
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
              String(match?._id ?? match?.matchReference?._id) === incomingId
                ? (() => {
                    matchFound = true;
                    return mergeIntoMatchReference(match, incomingMatch);
                  })()
                : match
            );
            return { ...group, matches };
          });
        }

        if (Array.isArray(next.boards)) {
          const boardNumber = toNumericBoardNumber(delta.data?.boardNumber ?? incomingMatch?.boardReference);
          if (boardNumber !== null) {
            const incomingMatchId = incomingId;
            next.boards = next.boards.map((board: any) => {
              if (toNumericBoardNumber(board?.boardNumber) !== boardNumber) return board;
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
                    ? (incomingMatch || board.currentMatch || incomingMatchId)
                    : delta.action === "finished"
                      ? undefined
                      : board.currentMatch,
                nextMatch:
                  delta.action === "finished"
                    ? (delta.data?.nextMatch ?? board.nextMatch)
                    : delta.action === "started"
                      ? (delta.data?.nextMatch ?? board.nextMatch)
                    : board.nextMatch,
              };
            });
          }
        }
        applied = matchFound || boardFound;
        if (delta.action === "finished" && !applied) {
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
    const normalizedCode = typeof code === "string" ? code : String(code || "");
    const payload = extractTournamentPayload(initialData);
    if (payload && initialDataHydratedCodeRef.current !== normalizedCode) {
      applySectionPayload("overview", payload);
      applyTournamentData(
        { ...payload.tournament, viewer: payload.viewer },
        user?._id,
        normalizedCode,
        setters
      );
      if (initialSections) {
        const sectionEntries: TournamentSection[] = ["players", "boards", "groups", "bracket"];
        sectionEntries.forEach((section) => {
          const sectionPayload = extractTournamentPayload(initialSections[section]);
          if (!sectionPayload) return;
          applySectionPayload(section, sectionPayload);
        });
      }
      initialDataHydratedCodeRef.current = normalizedCode;
      return;
    }
    if (initialDataHydratedCodeRef.current !== normalizedCode) {
      initialDataHydratedCodeRef.current = normalizedCode;
      fetchAll("overview");
    }
  }, [code, fetchAll, initialData, initialSections, user?._id, applySectionPayload]);

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
    lastLoadedSection,
    silentRefresh,
    resyncLiteData,
    applySseDelta,
    resyncFullData,
  };
}
