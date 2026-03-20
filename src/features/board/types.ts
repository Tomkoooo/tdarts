export interface BoardPlayer {
  playerId: { _id: string; name: string };
  highestCheckout?: number;
  oneEightiesCount?: number;
  legsWon?: number;
  legsLost?: number;
  average?: number;
}

export interface BoardScorer {
  playerId: string;
  name: string;
}

export interface Board {
  boardNumber: number;
  name?: string;
  status: string;
  currentMatch?: string;
  nextMatch?: string;
  scoliaSerialNumber?: string;
  scoliaAccessToken?: string;
}

export interface Match {
  _id: string;
  boardReference: number;
  type: string;
  round: number;
  player1: BoardPlayer;
  player2: BoardPlayer;
  scorer: BoardScorer;
  status: string;
  startingScore: number;
  legsToWin?: number;
  startingPlayer?: 1 | 2;
}

export interface UserRole {
  clubRole: "admin" | "moderator" | "member";
  tournamentRole?: "player" | "moderator" | "admin";
}

export type BoardFlowState =
  | "auth"
  | "selectBoard"
  | "selectMatch"
  | "setup"
  | "game"
  | "localGame";
