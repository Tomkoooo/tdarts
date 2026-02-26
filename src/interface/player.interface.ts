import mongoose from "mongoose";

export interface TournamentHistory {
    tournamentId: string;
    tournamentName: string;
    isVerified: boolean;
    position: number;
    eliminatedIn: string;
    stats: {
        matchesWon: number;
        matchesLost: number;
        legsWon: number;
        legsLost: number;
        oneEightiesCount: number;
        highestCheckout: number;
        average: number; // Tornához tartozó átlag (meccs átlagok átlaga)
    };
    date: Date;
    verified: boolean;
    mmrChange?: number;
    oacMmrChange?: number;
}

export interface PlayerHonor {
    title: string;
    year: number;
    type: 'rank' | 'tournament' | 'special';
    description?: string;
}

export interface PlayerSeasonStats {
    year: number;
    stats: {
        tournamentsPlayed: number;
        matchesPlayed: number;
        legsWon: number;
        legsLost: number;
        avg: number;
        oneEightiesCount: number;
        highestCheckout: number;
        averagePosition: number;
        bestPosition: number;
        totalMatchesWon: number;
        totalMatchesLost: number;
        totalLegsWon: number;
        totalLegsLost: number;
        total180s: number;
        mmr: number;
        oacMmr: number;
    };
    snapshotDate: Date;
    tournamentHistory?: TournamentHistory[];
}

export interface PlayerStatistics {
    tournamentsPlayed: number;
    bestPosition: number;
    totalMatchesWon: number;
    totalMatchesLost: number;
    totalLegsWon: number;
    totalLegsLost: number;
    total180s: number;
    highestCheckout: number;
    averagePosition: number;
    mmr: number; // Matchmaking Rating - performance-based ranking
    oacMmr: number; // OAC National MMR
}

export interface PlayerDocument {
    _id: mongoose.Types.ObjectId;
    /**
     * Opcionális userRef, csak regisztrált játékosnál
     */
    userRef?: string; // user collection reference
    /**
     * Játékos neve (regisztrált: user neve, guest: megadott név)
     */
    name: string;
    type?: 'individual' | 'pair' | 'team';
    members?: string[] | PlayerDocument[];
    /**
     * Indicates if this is a registered user
     */
    isRegistered?: boolean;
    /**
     * Statisztikák (csak aggregálható mezők, tornák ref listája)
     */
    stats: {
        tournamentsPlayed: number;
        matchesPlayed: number;
        legsWon: number;
        legsLost: number;
        avg: number;
        oneEightiesCount: number;
        highestCheckout: number;
        averagePosition: number;
        bestPosition: number;
        totalMatchesWon: number;
        totalMatchesLost: number;
        totalLegsWon: number;
        totalLegsLost: number;
        total180s: number;
        mmr: number; // Matchmaking Rating
        oacMmr: number; // OAC National MMR
    };
    /**
     * Tournament history with detailed results
     */
    tournamentHistory?: TournamentHistory[];
    
    // Historical
    honors?: PlayerHonor[];
    previousSeasons?: PlayerSeasonStats[];
    profilePicture?: string;
    publicConsent?: boolean;
    country?: string;
}

export interface Player {
    _id: string;
    name: string;
    type?: 'individual' | 'pair' | 'team';
    members?: Partial<Player>[];
    stats: {
        tournamentsPlayed: number;
        matchesPlayed: number;
        legsWon: number;
        legsLost: number;
        avg: number;
        oneEightiesCount: number;
        highestCheckout: number;
        averagePosition: number;
        bestPosition: number;
        totalMatchesWon: number;
        totalMatchesLost: number;
        totalLegsWon: number;
        totalLegsLost: number;
        total180s: number;
        mmr: number; // Matchmaking Rating
        oacMmr: number; // OAC National MMR
    };
    tournamentHistory?: TournamentHistory[];
    statistics?: PlayerStatistics;
    
    // Historical
    honors?: PlayerHonor[];
    previousSeasons?: PlayerSeasonStats[];
    profilePicture?: string;
    publicConsent?: boolean;
    country?: string;
}