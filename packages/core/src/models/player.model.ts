import { PlayerDocument } from "../interfaces/player.interface";
import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema<PlayerDocument>({
  userRef: { type: mongoose.Types.ObjectId, ref: "User", required: false },
  name: { type: String, required: true },
  type: { type: String, enum: ['individual', 'pair', 'team'], default: 'individual' },
  members: [{ type: mongoose.Types.ObjectId, ref: 'Player' }],
  isRegistered: { type: Boolean, default: false },
  stats: {
    tournamentsPlayed: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    legsWon: { type: Number, default: 0 },
    legsLost: { type: Number, default: 0 },
    oneEightiesCount: { type: Number, default: 0 },
    highestCheckout: { type: Number, default: 0 },
    avg: { type: Number, default: 0 },
    firstNineAvg: { type: Number, default: 0 },
    /** Rolling mean of match averages from the last 10 finished closed tournaments (see tournament finish + backfill script). */
    last10ClosedAvg: { type: Number, default: 0 },
    averagePosition: { type: Number, default: 0 },
    bestPosition: { type: Number, default: 999 },
    totalMatchesWon: { type: Number, default: 0 },
    totalMatchesLost: { type: Number, default: 0 },
    totalLegsWon: { type: Number, default: 0 },
    totalLegsLost: { type: Number, default: 0 },
    total180s: { type: Number, default: 0 },
    mmr: { type: Number, default: 800 },
    oacMmr: { type: Number, default: 800 },
  },
  tournamentHistory: [{
    isVerified: { type: Boolean, default: false },
    tournamentId: { type: String, required: true },
    tournamentName: { type: String, required: true },
    position: { type: Number, required: true },
    eliminatedIn: { type: String, required: true },
    stats: {
      matchesWon: { type: Number, default: 0 },
      matchesLost: { type: Number, default: 0 },
      legsWon: { type: Number, default: 0 },
      legsLost: { type: Number, default: 0 },
      oneEightiesCount: { type: Number, default: 0 },
      highestCheckout: { type: Number, default: 0 },
      average: { type: Number, default: 0 },
      firstNineAvg: { type: Number, default: 0 },
    },
    date: { type: Date, default: Date.now },
    verified: { type: Boolean, default: false },
    mmrChange: { type: Number },
    oacMmrChange: { type: Number }
  }],
  honors: [{
    title: { type: String, required: true },
    year: { type: Number, required: true },
    type: { type: String, enum: ['rank', 'tournament', 'special'], default: 'special' },
    description: { type: String }
  }],
  previousSeasons: [{
    year: { type: Number, required: true },
    stats: {
      tournamentsPlayed: { type: Number, default: 0 },
      matchesPlayed: { type: Number, default: 0 },
      legsWon: { type: Number, default: 0 },
      legsLost: { type: Number, default: 0 },
      oneEightiesCount: { type: Number, default: 0 },
      highestCheckout: { type: Number, default: 0 },
      avg: { type: Number, default: 0 },
      firstNineAvg: { type: Number, default: 0 },
      averagePosition: { type: Number, default: 0 },
      bestPosition: { type: Number, default: 999 },
      totalMatchesWon: { type: Number, default: 0 },
      totalMatchesLost: { type: Number, default: 0 },
      totalLegsWon: { type: Number, default: 0 },
      totalLegsLost: { type: Number, default: 0 },
      total180s: { type: Number, default: 0 },
      mmr: { type: Number, default: 800 },
      oacMmr: { type: Number, default: 800 },
    },
    snapshotDate: { type: Date, default: Date.now },
    tournamentHistory: { type: Array, default: [] }
  }],
  profilePicture: { type: String, default: null },
  publicConsent: { type: Boolean, default: false },
  country: { type: String, default: null },
}, { collection: 'players' });

PlayerSchema.index({ 'stats.mmr': 1 });
PlayerSchema.index({ 'stats.oacMmr': -1, name: 1 });
PlayerSchema.index({ country: 1, 'stats.oacMmr': -1, name: 1 });
PlayerSchema.index({ userRef: 1 }, { sparse: true });
PlayerSchema.index({ name: 1, userRef: 1 });
PlayerSchema.index({ members: 1 }, { sparse: true });

export const PlayerModel = mongoose.models.Player || mongoose.model<PlayerDocument>("Player", PlayerSchema);
