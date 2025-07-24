import mongoose, { Document, Types } from 'mongoose';
import { Matches } from './matches.interface';

// Plain types (API, DTO, stb.)
export interface TournamentPlayer {
    _id: string;
    playerReference: string;
    status: 'applied' | 'confirmed' | 'checked-in' | 'eliminated' | 'winner';
    groupId: string;
    groupOrdinalNumber: number;
    groupStanding: number;
    tournamentStanding: number;
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
    matches?: Matches[];
}

export interface Tournament {
    _id: string;
    tournamentId: string;
    clubId: string;
    tournamentPlayers: TournamentPlayer[];
    tournamentSettings: {
        status: 'pending' | 'active' | 'finished' | 'group' | 'knockout';
        name: string;
        description?: string;
        startDate: Date;
        maxPlayers: number;
        format: 'group' | 'knockout' | 'group_knockout';
        startingScore: number;
        boardCount: number;
        entryFee: number;
        tournamentPassword: string;
    };
    groups: TournamentGroup[];
    knockout: {
        round: number;
        matches: Matches[];
    }[];
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    isDeleted: boolean;
    isArchived: boolean;
    isCancelled: boolean;
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