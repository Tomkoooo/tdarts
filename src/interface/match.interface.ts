import { Types, Document } from 'mongoose';

export interface MatchPlayer {
  playerId: Types.ObjectId;
  legsWon: number;
  legsLost: number;
  average: number; // 0, ha nincs adat
  highestCheckout?: number;
  oneEightiesCount?: number;
}

export interface Throw {
  score: number;
  darts: number;
  isDouble?: boolean;
  isCheckout?: boolean;
}

export interface Leg {
  legNumber: number;
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId?: Types.ObjectId;
  checkoutScore?: number;
  checkoutDarts?: number;
  winnerArrowCount?: number; // Hány nyílból szállt ki a győztes
  loserRemainingScore?: number; // A vesztes játékos maradék pontjai
  doubleAttempts?: number;
  player1TotalDarts?: number; // Total darts thrown by player 1 (accounts for checkout)
  player2TotalDarts?: number; // Total darts thrown by player 2 (accounts for checkout)
  createdAt: Date;
}

export interface Match {
  _id: Types.ObjectId;
  boardReference: number;
  tournamentRef: Types.ObjectId;
  type: 'group' | 'knockout';
  round: number;
  bracketPosition?: number; // Position within round for bracket display
  scorerSource?: {
    type: 'group_loser' | 'match_loser' | 'manual';
    sourceMatchId?: Types.ObjectId;
    playerId?: Types.ObjectId;
  };
  player1?: MatchPlayer;
  player2?: MatchPlayer;
  scorer?: Types.ObjectId;
  status: 'pending' | 'ongoing' | 'finished';
  winnerId?: Types.ObjectId;
  legsToWin?: number;
  startingPlayer?: 1 | 2;
  legs?: Leg[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchDocument extends Omit<Match, '_id'>, Document {
  _id: Types.ObjectId;
  winnerId?: Types.ObjectId;
} 