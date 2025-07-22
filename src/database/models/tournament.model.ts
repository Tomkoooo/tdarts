import mongoose, { Types } from 'mongoose';
import { TournamentDocument } from '@/interface/tournament.interface';

const groupStandingSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  points: { type: Number, default: 0 },
  legsWon: { type: Number, default: 0 },
  legsLost: { type: Number, default: 0 },
  average: { type: Number, default: 0 },
  rank: { type: Number, default: 0 },
}, { _id: false });

const tournamentGroupSchema = new mongoose.Schema({
  id: { type: String, required: true },
  board: { type: Number, required: true }, // boardNumber
  name: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
}, { _id: false });

const knockoutMatchSchema = new mongoose.Schema({
  round: { type: Number, required: true },
  player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  scorer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  matchRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
}, { _id: false });

const tournamentSettingsSchema = new mongoose.Schema({
  format: { type: String, enum: ['group', 'knockout', 'group_knockout'], required: true },
  startingScore: { type: Number, required: true },
  tournamentPassword: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  startDate: { type: Date, required: true },
}, { _id: false });

const tournamentSchema = new mongoose.Schema<TournamentDocument>({
  tournamentId: { type: String, required: true, unique: true },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true }],
  tournamentSettings: { type: tournamentSettingsSchema, required: true },
  groups: [tournamentGroupSchema],
  knockout: [knockoutMatchSchema],
  status: { type: String, enum: ['pending', 'active', 'finished'], default: 'pending' },
}, { timestamps: true });

export const TournamentModel = mongoose.models.Tournament || mongoose.model<TournamentDocument>('Tournament', tournamentSchema); 