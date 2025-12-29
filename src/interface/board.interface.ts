import mongoose from "mongoose";

export interface BoardDocument {
  _id: string | mongoose.Types.ObjectId;
  clubId: string | mongoose.Types.ObjectId;
  boardNumber: number;
  boardId: string;
  name?: string;
  description?: string;
  status: 'idle' | 'waiting' | 'playing';
  isActive: boolean;
  waitingPlayers: (string | mongoose.Types.ObjectId)[];
  /**
   * Az aktuális meccs (match collection ref), ha van folyamatban
   */
  currentMatch?: string | mongoose.Types.ObjectId;
  scoliaSerialNumber?: string;
  scoliaAccessToken?: string;
  updatedAt: Date;
}