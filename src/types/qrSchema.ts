import mongoose from "mongoose";

export interface IQrToken extends Document {
    _id: string;
    token: string;
    tournamentId: string;
    boardNumber: number;
    createdAt: Date;
    expiresAt: Date;
  }

export const QrTokenSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
    boardNumber: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  });