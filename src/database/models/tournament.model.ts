import mongoose from 'mongoose';
import { TournamentDocument } from '@/interface/tournament.interface';
import "@/database/models/club.model";
import "@/database/models/player.model";
import "@/database/models/match.model";

const tournamentSchema = new mongoose.Schema<TournamentDocument>({
    tournamentId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true,
        default: () => {
            // Generate a random 4-character alphanumeric string (letters and numbers)
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let result = '';
            for (let i = 0; i < 4; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
        }
    },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    league: { type: mongoose.Schema.Types.ObjectId, ref: 'League', required: false },
    tournamentPlayers: [{
        playerReference: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
        status: { type: String, enum: ['applied', 'confirmed', 'checked-in', 'eliminated', 'winner'], required: true, default: 'applied' },
        groupId: { type: mongoose.Schema.Types.ObjectId, default: null },
        groupOrdinalNumber: { type: Number, default: null },
        groupStanding: { type: Number,  default: null },
        tournamentStanding: { type: Number,  default: null },
        stats: {
            matchesWon: { type: Number, required: true, default: 0 },
            matchesLost: { type: Number, required: true, default: 0 },
            legsWon: { type: Number, required: true, default: 0 },
            legsLost: { type: Number, required: true, default: 0 },
            avg: { type: Number, required: true, default: 0 },
            firstNineAvg: { type: Number, required: false, default: 0 },
            oneEightiesCount: { type: Number, required: true, default: 0 },
            highestCheckout: { type: Number, required: true, default: 0 },
        }
    }],
    waitingList: [{
        playerReference: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
        addedAt: { type: Date, default: Date.now },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    notificationSubscribers: [{
        userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        email: { type: String, required: true },
        subscribedAt: { type: Date, default: Date.now },
        notifiedAt: { type: Date }
    }],
    groups: [{
        board: { type: Number, required: true },
        matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true }],
    }],
    knockout: [{
        round: { type: Number, required: true },
        matches: [{
            player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
            player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
            matchReference: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' }
        }]
    }],
    boards: [{
        boardNumber: { type: Number, required: true },
        name: { type: String, default: null },
        currentMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
        nextMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
        status: { type: String, enum: ['idle', 'waiting', 'playing'], default: 'idle' },
        isActive: { type: Boolean, default: true },
        scoliaSerialNumber: { type: String, default: null },
        scoliaAccessToken: { type: String, default: null },
    }],
    tournamentSettings: {
        status: { type: String, enum: ['pending', 'active', 'finished', 'group-stage', 'knockout'], required: true, default: 'pending' },
        name: { type: String, required: true },
        description: { type: String, default: null },
        startDate: { type: Date, required: true, default: Date.now },
        endDate: { type: Date, default: null },
        maxPlayers: { type: Number, required: true },
        format: { type: String, enum: ['group', 'knockout', 'group_knockout'], required: true },
        startingScore: { type: Number, required: true, default: 501 },
        tournamentPassword: { type: String, required: true },
        knockoutMethod: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
        boardCount: { type: Number, default: 2 },
        entryFee: { type: Number, default: 0 },
        location: { type: String, default: null },
        locationData: {
            rawInput: { type: String, default: null },
            formattedAddress: { type: String, default: null },
            addressLine1: { type: String, default: null },
            city: { type: String, default: null },
            postalCode: { type: String, default: null },
            country: { type: String, default: null },
            placeId: { type: String, default: null },
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
            geocodeStatus: { type: String, enum: ['pending', 'ok', 'needs_review', 'failed', 'manual'], default: 'pending' },
            geocodeUpdatedAt: { type: Date, default: null },
            lastRequestedAt: { type: Date, default: null },
            source: { type: String, enum: ['legacy', 'user', 'google', 'manual', 'backfill'], default: 'legacy' },
            previewImage: { type: String, default: null },
        },
        type: { type: String, enum: ['amateur', 'open'], default: 'amateur' },
        participationMode: { type: String, enum: ['individual', 'pair', 'team'], default: 'individual' },
        registrationDeadline: { type: Date, default: null },
        coverImage: { type: String, default: null },
        reminderSent: { type: Boolean, default: false },
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isCancelled: { type: Boolean, default: false },
    isSandbox: { type: Boolean, default: false },
    verified: { type: Boolean, default: false },
    paymentStatus: { type: String, enum: ['none', 'pending', 'paid'], default: 'none' },
    stripeSessionId: { type: String, default: null },
    invoiceId: { type: String, default: null },
    billingInfoSnapshot: {
        type: { type: String, enum: ['individual', 'company'], default: null },
        name: { type: String, default: null },
        taxId: { type: String, default: null },
        country: { type: String, default: 'HU' },
        city: { type: String, default: null },
        zip: { type: String, default: null },
        address: { type: String, default: null },
        email: { type: String, default: null },
    },
}, { collection: 'tournaments' });

// Improves subscription checks and idempotent update query performance.
tournamentSchema.index({ tournamentId: 1, 'notificationSubscribers.userRef': 1 });

export const TournamentModel = mongoose.models.Tournament || mongoose.model<TournamentDocument>('Tournament', tournamentSchema);