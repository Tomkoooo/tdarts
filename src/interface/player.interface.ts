import mongoose from "mongoose";

export interface TournamentHistory {
    tournamentId: string;
    tournamentName: string;
    position: number;
    eliminatedIn: string;
    stats: {
        matchesWon: number;
        matchesLost: number;
        legsWon: number;
        legsLost: number;
        oneEightiesCount: number;
        highestCheckout: number;
    };
    date: Date;
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
    };
    /**
     * Tournament history with detailed results
     */
    tournamentHistory?: TournamentHistory[];
}

export interface Player {
    _id: string;
    name: string;
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
    };
    tournamentHistory?: TournamentHistory[];
    statistics?: PlayerStatistics;
}