import mongoose from 'mongoose';
import { TournamentDocument } from '@/interface/tournament.interface';
import { GenerateRandomHash } from '@/lib/utils';

const tournamentSchema = new mongoose.Schema<TournamentDocument>({
    tournamentId: { 
        type: String, 
        required: true, 
        unique: true,
        default: () => {
            // Generate a random 4-character alphanumeric string (letters and numbers)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 4; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }
    },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    tournamentPlayers: {
        type: [{
            playerReference: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
            status: { type: String, enum: ['applied', 'confirmed', 'checked-in', 'eliminated', 'winner'], required: true },
            groupId: { type: mongoose.Schema.Types.ObjectId, required: true },
            groupOrdinalNumber: { type: Number, required: true },
            groupStanding: { type: Number, required: true },
            tournamentStanding: { type: Number, required: true },
            stats: {
                matchesWon: { type: Number, required: true },
                matchesLost: { type: Number, required: true },
                legsWon: { type: Number, required: true },
                legsLost: { type: Number, required: true },
                avg: { type: Number, required: true },
                oneEightiesCount: { type: Number, required: true },
                highestCheckout: { type: Number, required: true },
            }
        }]
    },
    groups: [{
        type: {
            board: { type: Number, required: true },
            matches: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
        }
    }],
    knockout: [{
        type: {
            round: { type: Number, required: true },
            matches: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
        }
    }],
    tournamentSettings: {
        type: {
            status: { type: String, enum: ['pending', 'active', 'finished', 'group', 'knockout'], required: true },
            name: { type: String, required: true },
            description: { type: String, default: null },
            startDate: { type: Date, required: true, default: Date.now },
            maxPlayers: { type: Number, required: true },
            format: { type: String, enum: ['group', 'knockout', 'group_knockout'], required: true },
            startingScore: { type: Number, required: true },
            tournamentPassword: { type: String, required: true },
        }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isCancelled: { type: Boolean, default: false },
}, { collection: 'tournaments' });

export const TournamentModel = mongoose.models.Tournament || mongoose.model<TournamentDocument>('Tournament', tournamentSchema);