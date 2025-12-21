import { TournamentHistory } from "@/interface/player.interface";

/**
 * OAC MMR (National Matchmaking Rating) Service
 * 
 * Calculates player performance rating for the national league based on:
 * - Performance delta (relative to verified averages)
 * - Placement delta
 * - Special bonuses (180s, high checkouts)
 * 
 * Formula:
 * OAC_MMR_Change = (PerformanceDelta) + (PlacementDelta) + (SpecialBonuses)
 * PerformanceDelta = (CurrentTournamentAverage - PlayerVerifiedAverage) * 2.5
 * PlacementDelta = (TotalParticipants / 2 - Placement) * 2
 */
export class OacMmrService {
    public static readonly BASE_OAC_MMR = 800;

    /**
     * Calculate verified average from tournament history
     */
    static calculateVerifiedAverage(history: TournamentHistory[]): number {
        const verifiedEntries = history.filter(h => h.verified && h.stats?.average > 0);
        if (verifiedEntries.length === 0) return 0;

        const sum = verifiedEntries.reduce((acc, entry) => acc + entry.stats.average, 0);
        return sum / verifiedEntries.length;
    }

    /**
     * Calculate OAC MMR change
     */
    static calculateMMRChange(params: {
        currentOacMmr: number;
        placement: number;
        totalParticipants: number;
        currentAverage: number;
        verifiedAverage: number;
        oneEightiesCount: number;
        highestCheckout: number;
        matchesWon: number;
    }): number {
        const {
            currentOacMmr,
            placement,
            totalParticipants,
            currentAverage,
            verifiedAverage,
            oneEightiesCount,
            highestCheckout,
            matchesWon
        } = params;

        // If no matches won, MMR change is 0
        if (matchesWon === 0) {
            console.log(`OAC MMR Calc [${currentOacMmr}]: skipping due to 0 wins.`);
            return currentOacMmr;
        }

        // 1. Performance Delta
        // Use 0 if no verified average exists (ensures delta is 0 for first-timers)
        const performanceDelta = verifiedAverage > 0 ? (currentAverage - verifiedAverage) * 2.5 : 0;

        // 2. Placement Delta
        // Positive for top half, negative for bottom half
        const placementDelta = (totalParticipants / 2 - placement) * 2;

        // 3. Special Bonuses
        let specialBonuses = 0;
        
        // 180s
        specialBonuses += oneEightiesCount * 5;

        // High Checkouts
        if (highestCheckout >= 150 && highestCheckout <= 170) {
            specialBonuses += 15;
        } else if (highestCheckout >= 100 && highestCheckout < 150) {
            specialBonuses += 5;
        }

        const totalChange = performanceDelta + placementDelta + specialBonuses;
        
        console.log(`OAC MMR Calc [${currentOacMmr}]:
            Performance: ${performanceDelta.toFixed(2)} (${verifiedAverage > 0 ? `vs ${verifiedAverage.toFixed(2)}` : 'new player'})
            Placement: (${totalParticipants}/2 - ${placement}) * 2 = ${placementDelta.toFixed(2)}
            Bonuses: ${specialBonuses}
            Total Change: ${totalChange.toFixed(2)}
        `);

        return Math.max(0, Math.round(currentOacMmr + totalChange));
    }
}
