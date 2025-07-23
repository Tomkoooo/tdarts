import mongoose from "mongoose";

export interface PlayerDocument {
    _id: string | mongoose.Types.ObjectId;
    /**
     * Opcionális userRef, csak regisztrált játékosnál
     */
    userRef?: string; // user collection reference
    /**
     * Játékos neve (regisztrált: user neve, guest: megadott név)
     */
    name: string;
    /**
     * Statisztikák (csak aggregálható mezők, tornák ref listája)
     */
    stats: {
        tournamentsPlayed: (string | mongoose.Types.ObjectId)[]; // Tournament ref-ek
        matchesPlayed: number;
        legsWon: number;
        legsLost: number;
        avg: number;
        oneEightiesCount: number;
        highestCheckout: number;
    };
}

export interface Player {
    _id: string;
    name: string;
    stats: {
        tournamentsPlayed: (string | mongoose.Types.ObjectId)[]; // Tournament ref-ek
        matchesPlayed: number;
        legsWon: number;
        legsLost: number;
        avg: number;
        oneEightiesCount: number;
        highestCheckout: number;
    };
}