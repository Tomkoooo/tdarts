import { Document, Types } from 'mongoose';

// Plain types (API, DTO, stb.)
export interface TournamentPlayer {
    _id?: string;
    playerReference: string | PlayerDocument;
    status: 'applied' | 'confirmed' | 'checked-in' | 'eliminated' | 'winner';
    groupId?: string;
    groupOrdinalNumber?: number;
    groupStanding?: number;
    tournamentStanding?: number;
    finalPosition?: number;
    eliminatedIn?: string;
    finalStats?: {
        average: number;
        checkoutRate: number;
        legsWon: number;
        legsPlayed: number;
        matchesWon: number;
        matchesPlayed: number;
        highestCheckout: number;
        oneEighties: number;
    };
    stats: {
        matchesWon: number;
        matchesLost: number;
        legsWon: number;
        legsLost: number;
        avg: number;
        oneEightiesCount: number;
        highestCheckout: number;
    };
}

export interface TournamentGroup {
    _id: string;
    board: number;
    matches: string[];
}

export interface KnockoutRound {
    round: number;
    matches: {
        player1: string | PlayerDocument;
        player2: string | PlayerDocument;
        matchReference?: string | MatchDocument;
    }[];
}

export interface TournamentSettings {
    status: 'pending' | 'active' | 'finished' | 'group-stage' | 'knockout';
    name: string;
    description?: string;
    startDate: Date;
    maxPlayers: number;
    format: 'group' | 'knockout' | 'group_knockout';
    startingScore: number;
    tournamentPassword: string;
    knockoutMethod?: 'automatic' | 'manual';
    boardCount: number;
    entryFee: number;
    location: string;
    type: 'amateur' | 'open';
    registrationDeadline: Date
}

export interface PlayerDocument extends Document {
    _id: string;
    name: string;
    // Add other player fields as needed
}

export interface MatchDocument extends Document {
    _id: string;
    // Add other match fields as needed
}

export interface Tournament {
    _id?: string;
    tournamentId: string;
    clubId: string | Document;
    tournamentPlayers: TournamentPlayer[];
    groups: TournamentGroup[];
    knockout: KnockoutRound[];
    tournamentSettings: TournamentSettings;
    createdAt?: Date;
    updatedAt?: Date;
    isActive?: boolean;
    isDeleted?: boolean;
    isArchived?: boolean;
    isCancelled?: boolean;
}

// Document types (Mongoose)
export interface TournamentPlayerDocument extends Omit<TournamentPlayer, '_id' | 'groupId' | 'playerReference'> {
    _id: Types.ObjectId;
    groupId: Types.ObjectId;
    playerReference: Types.ObjectId;
}
export interface TournamentGroupDocument extends Omit<TournamentGroup, 'id'> {
    id: Types.ObjectId;
}
export interface TournamentDocument extends Document, Omit<Tournament, '_id' | 'tournamentPlayers' | 'groups' | 'clubId'> {
    _id: Types.ObjectId;
    tournamentPlayers: TournamentPlayerDocument[];
    groups: TournamentGroupDocument[];
    clubId: Types.ObjectId;
}