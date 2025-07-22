import mongoose from "mongoose";

export interface TournamentSettings {
  format: 'group' | 'knockout' | 'group_knockout';
  startingScore: number;
  tournamentPassword: string;
  startDate: string;
  description: string;
  name: string;
}

export interface GroupStanding {
  playerId: mongoose.Types.ObjectId;
  points: number;
  legsWon: number;
  legsLost: number;
  average: number;
  rank: number;
}

export interface TournamentGroup {
  id: string;
  board: number; // boardNumber
  matches: mongoose.Types.ObjectId[];
}

export interface KnockoutMatch {
  round: number;
  player1: mongoose.Types.ObjectId;
  player2: mongoose.Types.ObjectId;
  scorer: mongoose.Types.ObjectId;
  matchRef: mongoose.Types.ObjectId;
}

export interface Tournament {
  _id: mongoose.Types.ObjectId;
  tournamentId: string;
  clubId: mongoose.Types.ObjectId;
  players: mongoose.Types.ObjectId[];
  tournamentSettings: TournamentSettings;
  groups: TournamentGroup[];
  knockout: KnockoutMatch[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TournamentDocument {
  _id: string | mongoose.Types.ObjectId;
  code: string;
  name: string;
  tournamentId: string;
  clubId: string | mongoose.Types.ObjectId;
  status: 'pending' | 'active' | 'finished';
  startDate?: string;
  players: (string | mongoose.Types.ObjectId)[];
  tournamentSettings: {
    format: string;
    startingScore: number;
    tournamentPassword: string;
  };
  groups: any[];
  knockout: any[];
  // ...other fields as needed
} 