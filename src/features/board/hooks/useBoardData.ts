"use client";

import { useCallback } from "react";
import axios from "axios";
import type { Board, Match } from "../types";

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
      const response = await axios.get(
        `/api/boards/${tournamentId}/getBoards`
      );
      return response.data.boards as Board[];
    } catch (err: any) {
      onError(t("nem_sikerult_betolteni_a_px4t"), "boards");
      console.error("Load boards error:", err);
      return [];
    }
  }, [tournamentId, t, onError]);

  const loadMatches = useCallback(async () => {
    if (!selectedBoard) return [];
    try {
      const response = await axios.get(
        `/api/boards/${tournamentId}/${selectedBoard.boardNumber}/matches`
      );
      return response.data.matches as Match[];
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
