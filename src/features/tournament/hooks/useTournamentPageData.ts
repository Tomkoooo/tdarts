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

/**
 * SSE match payloads are often unpopulated Mongo shapes (playerId without name).
 * Merge so legsWon etc. update while keeping display names from the hydrated client state.
 */
function mergeMatchPlayerSlot(existing: any, incoming: any) {
  if (!incoming) return existing;
  if (!existing) return incoming;
  const out: any = { ...existing, ...incoming };
  const ePid = existing?.playerId;
  const iPid = incoming?.playerId;
  if (iPid !== undefined && iPid !== null) {
    if (typeof iPid === "object" && !Array.isArray(iPid)) {
      const base =
        typeof ePid === "object" && ePid !== null && !Array.isArray(ePid) ? ePid : {};
      out.playerId = {
        ...base,
        ...iPid,
        name: (iPid as { name?: string }).name ?? (base as { name?: string }).name,
      };
    } else {
      out.playerId =
        typeof ePid === "object" && ePid !== null && !Array.isArray(ePid)
          ? { ...ePid, _id: iPid }
          : iPid;
    }
  }
  return out;
}

function deepMergeSseMatch(existing: any, incoming: any) {
  if (!incoming) return existing;
  if (!existing) return incoming;
  const next: any = {
    ...existing,
    ...incoming,
    player1: mergeMatchPlayerSlot(existing.player1, incoming.player1),
    player2: mergeMatchPlayerSlot(existing.player2, incoming.player2),
  };
  if (incoming.scorer !== undefined) {
    const eSc = existing.scorer;
    const iSc = incoming.scorer;
    const incomingScorerName = iSc && typeof iSc === "object" ? (iSc as { name?: string }).name : undefined;
    if (
      iSc &&
      typeof iSc === "object" &&
      (incomingScorerName === undefined || incomingScorerName === "") &&
      eSc &&
      typeof eSc === "object" &&
      (eSc as { name?: string }).name
    ) {
      next.scorer = { ...eSc, ...iSc, name: (eSc as { name?: string }).name };
    } else {
      next.scorer = iSc;
    }
  }
  return next;
}

const mergeIntoMatchReference = (existing: any, incoming: any) => {
  if (!incoming) return existing;
  if (existing?.matchReference) {
    return {
      ...existing,
      matchReference: deepMergeSseMatch(existing.matchReference || {}, incoming),
    };
  }
  return deepMergeSseMatch(existing || {}, incoming);
};

/** Resolve match id from board slot shapes: id string, { _id }, { matchReference: { _id } }. */
function boardMatchRefId(ref: unknown): string | null {
  if (ref == null) return null;
  if (typeof ref === "string" && ref.trim()) return ref.trim();
  if (typeof ref === "object") {
    const r = ref as { _id?: unknown; matchReference?: { _id?: unknown } };
    if (r.matchReference?._id != null) return String(r.matchReference._id);
    if (r._id != null) return String(r._id);
  }
  return null;
}

function mergeBoardSlotMatch(existing: any, incoming: any) {
  if (!incoming) return existing;
  if (existing == null) return incoming;
  if (typeof existing === "string") return incoming;
  if (existing?.matchReference) {
    return {
      ...existing,
      matchReference: deepMergeSseMatch(existing.matchReference || {}, incoming),
    };
  }
  return deepMergeSseMatch(existing, incoming);
}

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
    setters.setUserClubRole("none");
    setters.setUserPlayerStatus("none");
    setters.setUserPlayerId(null);
    return;
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
  const lastUserIdRef = useRef<string | undefined>(undefined);
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
        const prevClubId = prev?.clubId;
        const nextClubId = tournamentLite?.clubId;
        const prevClubIdIsPopulated =
          typeof prevClubId === "object" &&
          prevClubId !== null &&
          "_id" in prevClubId &&
          "name" in prevClubId;
        const nextClubIdIsBare =
          typeof nextClubId === "string" ||
          (typeof nextClubId === "object" &&
            nextClubId !== null &&
            !("name" in nextClubId));

        const previousBoards = Array.isArray(prev.boards) ? prev.boards : [];
        const liteBoards = Array.isArray(tournamentLite.boards) ? tournamentLite.boards : [];
        // Lite payload is authoritative for which boards exist (count / ids). Mapping over
        // previous boards and keeping unmatched entries resurrected deleted boards in the UI.
        const mergedBoards = liteBoards.map((liteBoard: any) => {
          const prevBoard = previousBoards.find(
            (b: any) => Number(b?.boardNumber) === Number(liteBoard?.boardNumber),
          );
          if (!prevBoard) return liteBoard;
          return {
            ...prevBoard,
            ...liteBoard,
            currentMatch: prevBoard?.currentMatch,
            nextMatch: prevBoard?.nextMatch,
          };
        });
        return {
          ...prev,
          ...tournamentLite,
          tournamentSettings: {
            ...(prev.tournamentSettings || {}),
            ...(tournamentLite.tournamentSettings || {}),
          },
          clubId: prevClubIdIsPopulated && nextClubIdIsBare ? prevClubId : nextClubId,
          boards: mergedBoards,
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
        let boardVisualUpdate = false;

        if (Array.isArray(next.matches)) {
          next.matches = next.matches.map((match: any) =>
            String(match?._id) === incomingId
              ? (() => {
                  matchFound = true;
                  return deepMergeSseMatch(match, incomingMatch);
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

        if (Array.isArray(next.knockout)) {
          next.knockout = next.knockout.map((round: any) => {
            if (!Array.isArray(round?.matches)) return round;
            const matches = round.matches.map((match: any) =>
              String(match?._id ?? match?.matchReference?._id) === incomingId
                ? (() => {
                    matchFound = true;
                    return mergeIntoMatchReference(match, incomingMatch);
                  })()
                : match
            );
            return { ...round, matches };
          });
        }

        if (Array.isArray(next.boards)) {
          const boardNumber = toNumericBoardNumber(delta.data?.boardNumber ?? incomingMatch?.boardReference);
          if (boardNumber !== null) {
            const incomingMatchId = incomingId;
            next.boards = next.boards.map((board: any) => {
              if (toNumericBoardNumber(board?.boardNumber) !== boardNumber) return board;

              if (delta.action === "started") {
                boardVisualUpdate = true;
                return {
                  ...board,
                  status: "playing",
                  currentMatch:
                    incomingMatch || board.currentMatch || incomingMatchId,
                  nextMatch: delta.data?.nextMatch ?? board.nextMatch,
                };
              }

              if (delta.action === "finished") {
                boardVisualUpdate = true;
                return {
                  ...board,
                  status: "waiting",
                  currentMatch: undefined,
                  nextMatch: delta.data?.nextMatch ?? board.nextMatch,
                };
              }

              const updatedBoard = { ...board };
              let slotMerged = false;

              if (incomingMatch) {
                if (boardMatchRefId(board.currentMatch) === incomingId) {
                  updatedBoard.currentMatch = mergeBoardSlotMatch(board.currentMatch, incomingMatch);
                  slotMerged = true;
                } else if (
                  !board.currentMatch &&
                  toNumericBoardNumber(incomingMatch.boardReference) === boardNumber
                ) {
                  updatedBoard.currentMatch = incomingMatch;
                  slotMerged = true;
                }

                if (boardMatchRefId(board.nextMatch) === incomingId) {
                  updatedBoard.nextMatch = mergeBoardSlotMatch(board.nextMatch, incomingMatch);
                  slotMerged = true;
                }
              }

              if (slotMerged) {
                boardVisualUpdate = true;
              }
              return updatedBoard;
            });
          }
        }

        applied = matchFound || boardVisualUpdate;
        if (delta.action === "finished" && !applied) {
          forceResync = true;
        }
        if (delta.action === "leg-finished" && !applied) {
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

  useEffect(() => {
    const normalizedCode = typeof code === "string" ? code : "";
    if (!normalizedCode) {
      lastUserIdRef.current = user?._id;
      return;
    }

    const userIdNow = user?._id;
    if (!userIdNow) {
      lastUserIdRef.current = undefined;
      return;
    }

    if (userIdNow === lastUserIdRef.current) {
      return;
    }

    lastUserIdRef.current = userIdNow;
    void fetchAll(currentViewRef.current, { bypassCache: true });
  }, [code, fetchAll, user?._id]);

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
