import { Types, Document } from 'mongoose';

export interface MatchPlayer {
  playerId: Types.ObjectId;
  legsWon: number;
  legsLost: number;
  average: number; // 0, ha nincs adat
}

export interface Throw {
  score: number;
  darts: number;
  isDouble?: boolean;
  isCheckout?: boolean;
}

export interface Leg {
  player1Score: number;
  player2Score: number;
  player1Throws: Throw[];
  player2Throws: Throw[];
  winnerId?: Types.ObjectId;
  checkoutScore?: number;
  checkoutDarts?: number;
  doubleAttempts?: number;
  createdAt: Date;
}

export interface Match {
  _id: Types.ObjectId;
  boardReference: number;
  tournamentRef: Types.ObjectId;
  type: 'group' | 'knockout';
  round: number;
  player1: MatchPlayer;
  player2: MatchPlayer;
  scorer: Types.ObjectId;
  status: 'pending' | 'ongoing' | 'finished';
  winnerId?: Types.ObjectId;
  legs?: Leg[];
  createdAt: Date;
  updatedAt: Date;
}

export interface MatchDocument extends Omit<Match, '_id'>, Document {
  _id: Types.ObjectId;
} 