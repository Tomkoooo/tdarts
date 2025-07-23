import { PlayerDocument } from "@/interface/player.interface";
import mongoose from "mongoose";

const PlayerSchema = new mongoose.Schema<PlayerDocument>({
    userRef: { type: mongoose.Types.ObjectId, ref: "Users", required: false },
    name: { type: String, required: true },
    stats: {
        tournamentsPlayed: [{ type: mongoose.Types.ObjectId, ref: "Tournament" }],
        matchesPlayed: { type: Number, default: 0 },
        legsWon: { type: Number, default: 0 },
        legsLost: { type: Number, default: 0 },
        oneEightiesCount: { type: Number, default: 0 },
        highestCheckout: { type: Number, default: 0 },
        avg: { type: Number, default: 0 },
    },
});

export const PlayerModel = mongoose.models.Player || mongoose.model<PlayerDocument>("Player", PlayerSchema);