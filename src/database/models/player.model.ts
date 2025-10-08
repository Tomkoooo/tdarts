import { PlayerDocument } from "@/interface/player.interface";
import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema<PlayerDocument>({
    userRef: { type: mongoose.Types.ObjectId, ref: "User", required: false },
    name: { type: String, required: true },
    isRegistered: { type: Boolean, default: false }, // Indicates if this is a registered user
    stats: {
        tournamentsPlayed: { type: Number, default: 0 },
        matchesPlayed: { type: Number, default: 0 },
        legsWon: { type: Number, default: 0 },
        legsLost: { type: Number, default: 0 },
        oneEightiesCount: { type: Number, default: 0 },
        highestCheckout: { type: Number, default: 0 },
        avg: { type: Number, default: 0 },
        averagePosition: { type: Number, default: 0 },
        bestPosition: { type: Number, default: 999 },
        totalMatchesWon: { type: Number, default: 0 },
        totalMatchesLost: { type: Number, default: 0 },
        totalLegsWon: { type: Number, default: 0 },
        totalLegsLost: { type: Number, default: 0 },
        total180s: { type: Number, default: 0 },
        mmr: { type: Number, default: 800 }, // Matchmaking Rating - starts at 1200
    },
    tournamentHistory: [{
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
            averagePosition: { type: Number, default: 0 },
        },
        date: { type: Date, default: Date.now },
    }]
}, {collection: 'players'});

export const PlayerModel = mongoose.models.Player || mongoose.model<PlayerDocument>("Player", PlayerSchema);