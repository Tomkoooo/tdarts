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
        player1?: string | PlayerDocument;
        player2?: string | PlayerDocument;
        matchReference?: string | MatchDocument;
    }[];
}

export interface TournamentBoard {
    boardNumber: number;
    name?: string;
    currentMatch?: string | MatchDocument;
    nextMatch?: string | MatchDocument;
    status: 'idle' | 'waiting' | 'playing';
    isActive: boolean;
}

export interface TournamentSettings {
    status: 'pending' | 'active' | 'finished' | 'group-stage' | 'knockout';
    name: string;
    description?: string;
    startDate: Date;
    endDate?: Date; // Optional end date for tournaments
    maxPlayers: number;
    format: 'group' | 'knockout' | 'group_knockout';
    startingScore: number;
    tournamentPassword: string;
    knockoutMethod?: 'automatic' | 'manual';
    boardCount: number;
    entryFee: number;
    location: string;
    type: 'amateur' | 'open';
    registrationDeadline: Date;
    coverImage?: string; // Optional cover image for SEO
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

export interface WaitingListPlayer {
    playerReference: string | PlayerDocument;
    addedAt: Date;
    addedBy?: string; // User ID who added them (for admin additions)
}

export interface NotificationSubscriber {
    userRef: string; // User ID who subscribed
    email: string;
    subscribedAt: Date;
    notifiedAt?: Date; // Last time they were notified
}

export interface Tournament {
    _id?: string;
    tournamentId: string;
    clubId: string | Document;
    tournamentPlayers: TournamentPlayer[];
    waitingList?: WaitingListPlayer[]; // Players waiting for a spot
    notificationSubscribers?: NotificationSubscriber[]; // Users who want to be notified
    groups: TournamentGroup[];
    knockout: KnockoutRound[];
    boards: TournamentBoard[];
    tournamentSettings: TournamentSettings;
    league?: string | Document; // Optional reference to League
    createdAt?: Date;
    updatedAt?: Date;
    isActive?: boolean;
    isDeleted?: boolean;
    isArchived?: boolean;
    isCancelled?: boolean;
    isSandbox?: boolean;
    verified?: boolean;
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
export interface TournamentBoardDocument {
    boardNumber: number;
    name?: string;
    currentMatch?: Types.ObjectId;
    nextMatch?: Types.ObjectId;
    status: 'idle' | 'waiting' | 'playing';
    isActive: boolean;
}

export interface WaitingListPlayerDocument {
    playerReference: Types.ObjectId;
    addedAt: Date;
    addedBy?: Types.ObjectId;
}

export interface NotificationSubscriberDocument {
    userRef: Types.ObjectId;
    email: string;
    subscribedAt: Date;
    notifiedAt?: Date;
}

export interface TournamentDocument extends Document, Omit<Tournament, '_id' | 'tournamentPlayers' | 'waitingList' | 'notificationSubscribers' | 'groups' | 'boards' | 'clubId' | 'league'> {
    _id: Types.ObjectId;
    tournamentPlayers: TournamentPlayerDocument[];
    waitingList?: WaitingListPlayerDocument[];
    notificationSubscribers?: NotificationSubscriberDocument[];
    groups: TournamentGroupDocument[];
    boards: TournamentBoardDocument[];
    clubId: Types.ObjectId;
    league?: Types.ObjectId; // Optional reference to League
}

// Manual groups (API DTOs)
export interface ManualGroupsBoard {
    boardNumber: number;
    isUsed: boolean;
}

export interface ManualGroupsAvailablePlayer {
    _id: string; // Player document id
    name: string;
}

export interface ManualGroupsContextResponse {
    boards: ManualGroupsBoard[];
    availablePlayers: ManualGroupsAvailablePlayer[];
}

export interface CreateManualGroupRequest {
    boardNumber: number;
    // Player document ids (must correspond to tournamentPlayers.playerReference)
    playerIds: string[];
}

export interface CreateManualGroupResponse {
    groupId: string;
    matchIds: string[];
}

// Bulk manual groups (API DTOs)
export interface ManualGroupCreateItem {
    boardNumber: number;
    playerIds: string[]; // Player document ids
}

export interface CreateManualGroupsRequest {
    groups: ManualGroupCreateItem[];
}

export interface CreatedGroupInfo {
    boardNumber: number;
    groupId: string;
    matchIds: string[];
}

export interface CreateManualGroupsResponse {
    groups: CreatedGroupInfo[];
}