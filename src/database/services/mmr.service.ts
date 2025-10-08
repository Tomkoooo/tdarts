/**
 * MMR (Matchmaking Rating) Service
 * 
 * Calculates player performance rating based on:
 * - Tournament placement (weighted by total participants)
 * - Match win/loss ratio
 * - Leg win/loss ratio
 * - Average score performance
 * 
 * MMR starts at 800 and adjusts based on performance
 */

export class MMRService {
    // Base MMR for new players
    private static readonly BASE_MMR = 800;
    
    // K-factor for MMR adjustments (higher = more volatile)
    private static readonly K_FACTOR = 32;
    
    /**
     * Calculate MMR change based on tournament performance
     * 
     * @param currentMMR - Player's current MMR
     * @param placement - Final placement in tournament (1 = winner)
     * @param totalParticipants - Total number of participants
     * @param matchWinRate - Percentage of matches won (0-1)
     * @param legWinRate - Percentage of legs won (0-1)
     * @param averageScore - Player's average score (3-dart average)
     * @param tournamentAverage - Tournament average score
     * @returns New MMR value
     */
    static calculateMMRChange(
        currentMMR: number,
        placement: number,
        totalParticipants: number,
        matchWinRate: number,
        legWinRate: number,
        averageScore: number,
        tournamentAverage: number = 45
    ): number {
        // 1. Placement factor (0-1, where 1 = winner, 0 = last place)
        const placementFactor = 1 - ((placement - 1) / Math.max(totalParticipants - 1, 1));
        
        // 2. Performance factor based on win rates and average
        const matchPerformance = matchWinRate;
        const legPerformance = legWinRate;
        const scorePerformance = Math.min(averageScore / Math.max(tournamentAverage, 1), 2); // Cap at 2x
        
        // 3. Dynamic placement weight based on tournament size
        // Larger tournaments = placement matters more (60-75% weight)
        // Smaller tournaments = performance matters more (60% placement)
        let placementWeight = 0.60; // Base weight for small tournaments (8 or less)
        if (totalParticipants >= 64) {
            placementWeight = 0.75; // 75% for very large tournaments
        } else if (totalParticipants >= 32) {
            placementWeight = 0.70; // 70% for large tournaments
        } else if (totalParticipants >= 16) {
            placementWeight = 0.65; // 65% for medium tournaments
        }
        
        // Remaining weight distributed among performance metrics
        const remainingWeight = 1 - placementWeight;
        const matchWeight = remainingWeight * 0.50; // 50% of remaining
        const legWeight = remainingWeight * 0.30;   // 30% of remaining
        const scoreWeight = remainingWeight * 0.20;  // 20% of remaining
        
        // Weighted performance with dynamic weights
        const overallPerformance = 
            (placementFactor * placementWeight) +
            (matchPerformance * matchWeight) +
            (legPerformance * legWeight) +
            (scorePerformance * scoreWeight);
        
        // 4. Expected performance (based on current MMR)
        // Players with higher MMR are expected to perform better
        const expectedPerformance = 0.5; // Neutral expectation
        
        // 5. Calculate MMR change
        const performanceDifference = overallPerformance - expectedPerformance;
        const mmrChange = this.K_FACTOR * performanceDifference;
        
        // 6. Scale MMR change based on tournament size (bigger tournaments = more impact)
        const tournamentSizeFactor = Math.min(totalParticipants / 16, 2); // Cap at 2x for 32+ player tournaments
        const scaledMMRChange = mmrChange * tournamentSizeFactor;
        
        // 7. Calculate new MMR
        const newMMR = Math.max(0, currentMMR + scaledMMRChange);
        
        console.log(`MMR Calculation:
            Current MMR: ${currentMMR}
            Placement: ${placement}/${totalParticipants}
            Placement Factor: ${placementFactor.toFixed(3)}
            Placement Weight: ${(placementWeight * 100).toFixed(0)}%
            Match Win Rate: ${matchWinRate.toFixed(3)} (weight: ${(matchWeight * 100).toFixed(1)}%)
            Leg Win Rate: ${legWinRate.toFixed(3)} (weight: ${(legWeight * 100).toFixed(1)}%)
            Score Performance: ${scorePerformance.toFixed(3)} (weight: ${(scoreWeight * 100).toFixed(1)}%)
            Overall Performance: ${overallPerformance.toFixed(3)}
            Tournament Size Factor: ${tournamentSizeFactor.toFixed(2)}x
            MMR Change: ${scaledMMRChange.toFixed(2)}
            New MMR: ${newMMR.toFixed(2)}
        `);
        
        return Math.round(newMMR);
    }
    
    /**
     * Get initial MMR for a new player
     */
    static getInitialMMR(): number {
        return this.BASE_MMR;
    }
    
    /**
     * Calculate expected win probability between two players
     * Used for matchmaking and seeding
     * 
     * @param playerMMR - Player's MMR
     * @param opponentMMR - Opponent's MMR
     * @returns Probability of player winning (0-1)
     */
    static calculateWinProbability(playerMMR: number, opponentMMR: number): number {
        const mmrDifference = opponentMMR - playerMMR;
        return 1 / (1 + Math.pow(10, mmrDifference / 400));
    }
    
    /**
     * Get MMR tier/rank name
     */
    static getMMRTier(mmr: number): { name: string; color: string } {
        if (mmr >= 1600) return { name: 'Elit', color: 'text-error' };
        if (mmr >= 1400) return { name: 'Mester', color: 'text-warning' };
        if (mmr >= 1200) return { name: 'Haladó', color: 'text-info' };
        if (mmr >= 1000) return { name: 'Középhaladó', color: 'text-success' };
        if (mmr >= 800) return { name: 'Kezdő+', color: 'text-primary' };
        return { name: 'Kezdő', color: 'text-base-content' };
    }
}
