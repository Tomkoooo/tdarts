"use client";

import { useCallback } from "react";
import type { Board, Match } from "../types";
import { getBoardListAction, getBoardMatchesAction } from "@/features/board/actions/boardPage.action";

const getTournamentPasswordKey = (tournamentId: string) =>
  `tournament_password_${tournamentId}`;
const getSelectedBoardKey = (tournamentId: string) =>
  `selected_board_${tournamentId}`;

export function useBoardData(
  tournamentId: string,
  isAuthenticated: boolean,
  selectedBoard: Board | null,
  t: (key: string) => string,
  onError: (message: string, context?: string) => void
) {
  const loadBoards = useCallback(async () => {
    try {
      const response = await getBoardListAction({ tournamentId });
      if (response && typeof response === 'object' && 'boards' in response) {
        return ((response as { boards?: unknown }).boards || []) as Board[];
      }
      return [];
    } catch (err: any) {
      onError(t("nem_sikerult_betolteni_a_px4t"), "boards");
      console.error("Load boards error:", err);
      return [];
    }
  }, [tournamentId, t, onError]);

  const loadMatches = useCallback(async () => {
    if (!selectedBoard) return [];
    try {
      const response = await getBoardMatchesAction({
        tournamentId,
        boardNumber: Number(selectedBoard.boardNumber),
      });
      if (response && typeof response === 'object' && 'matches' in response) {
        return ((response as { matches?: unknown }).matches || []) as Match[];
      }
      return [];
    } catch (err: any) {
      onError(t("nem_sikerult_betolteni_a_qh0h"), "matches");
      console.error("Load matches error:", err);
      return [];
    }
  }, [tournamentId, selectedBoard, t, onError]);

  return {
    loadBoards,
    loadMatches,
    getTournamentPasswordKey: () => getTournamentPasswordKey(tournamentId),
    getSelectedBoardKey: () => getSelectedBoardKey(tournamentId),
  };
}

export { getTournamentPasswordKey, getSelectedBoardKey };
