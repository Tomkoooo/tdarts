import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '../models/player.model';
import { PlayerDocument, PlayerHonor } from '@/interface/player.interface';

export class YearWrapService {
    
    /**
     * Performs the yearly reset for all players.
     * @param year The year being wrapped (e.g., 2025 when running in Jan 2026).
     */
    static async performYearlyReset(year: number): Promise<{ processed: number, honorsAwarded: number }> {
        await connectMongo();

        const players = await PlayerModel.find({});
        let honorsCount = 0;

        // 1. Determine Rank Honors (Top Players by MMR before reset)
        // Sort by MMR descending
        const sortedPlayers = [...players].sort((a, b) => (b.stats.mmr || 800) - (a.stats.mmr || 800));

        for (let i = 0; i < sortedPlayers.length; i++) {
            const player = sortedPlayers[i];
            const rank = i + 1;
            
            // Define Rank Honors
            if (rank === 1) {
                this.addHonor(player, {
                    title: `Rank #1 Global ${year}`,
                    year,
                    type: 'rank',
                    description: `Finished the ${year} season as the Top 1 player.`
                });
                honorsCount++;
            } else if (rank <= 3) {
                this.addHonor(player, {
                    title: `Top 3 Global ${year}`,
                    year,
                    type: 'rank',
                    description: `Finished the ${year} season in the Top 3.`
                });
                 honorsCount++;
            } else if (rank <= 10) {
                 this.addHonor(player, {
                    title: `Top 10 Global ${year}`,
                    year,
                    type: 'rank',
                    description: `Finished the ${year} season in the Top 10.`
                });
                 honorsCount++;
            } else if (rank <= 50) {
                 this.addHonor(player, {
                    title: `Top 50 Global ${year}`,
                    year,
                    type: 'rank',
                    description: `Finished the ${year} season in the Top 50.`
                });
                 honorsCount++;
            }
        }

        // 2. Process each player for Archiving and Reset
        for (const player of players) {
            // A. Tournament Honors (Calculate from history for that year)
            // Filter history for the wrapped year
            const seasonalHistory = player.tournamentHistory?.filter((t: any) => {
                const tDate = new Date(t.date || t.startDate);
                return tDate.getFullYear() === year;
            }) || [];
            
            const wins = seasonalHistory.filter((t: any) => t.position === 1).length;
            
            if (wins > 0) {
                this.addHonor(player, {
                    title: `${wins}x Tournament Winner ${year}`,
                    year,
                    type: 'tournament',
                    description: `Won ${wins} tournaments in ${year}.`
                });
                honorsCount++; // Just counting logic assignment
            }

            // B. Snapshot Stats and History
            if (!player.previousSeasons) player.previousSeasons = [];
            
            // Re-using seasonalHistory defined above in the honors check
            // seasonalHistory is already filtered for the target year.

            // Only archive if they actually played
            if (player.stats.matchesPlayed > 0 || player.stats.tournamentsPlayed > 0 || seasonalHistory.length > 0) {
                 const statsCopy = player.stats.toObject ? player.stats.toObject() : { ...player.stats };
                 
                 player.previousSeasons.push({
                    year: year,
                    stats: statsCopy,
                    snapshotDate: new Date(),
                    tournamentHistory: seasonalHistory.map((t: any) => ({
                        tournamentId: t.tournamentId,
                        tournamentName: t.tournamentName || t.name,
                        position: t.position,
                        eliminatedIn: t.eliminatedIn,
                        stats: t.stats?.toObject ? t.stats.toObject() : { ...t.stats },
                        date: t.date || t.startDate,
                        verified: t.verified || false,
                        mmrChange: t.mmrChange
                    }))
                });

                // Clear the seasonal history from the main history array
                player.tournamentHistory = player.tournamentHistory?.filter((t: any) => {
                    const tDate = new Date(t.date || t.startDate);
                    return tDate.getFullYear() !== year;
                });
            }

            // C. Reset Stats
            // Resetting all counters to 0 and MMR to 800
            player.stats = {
                tournamentsPlayed: 0,
                matchesPlayed: 0,
                legsWon: 0,
                legsLost: 0,
                oneEightiesCount: 0,
                highestCheckout: 0,
                avg: 0,
                averagePosition: 0,
                bestPosition: 999, // Reset best position
                totalMatchesWon: 0,
                totalMatchesLost: 0,
                totalLegsWon: 0,
                totalLegsLost: 0,
                total180s: 0,
                mmr: 800, // RESET MMR
                oacMmr: 800, // RESET OAC MMR
            };

            await player.save();
        }

        return { processed: players.length, honorsAwarded: honorsCount };
    }

    private static addHonor(player: PlayerDocument, honor: PlayerHonor) {
        if (!player.honors) player.honors = [];
        // Avoid duplicates
        const exists = player.honors.some(h => h.title === honor.title && h.year === honor.year);
        if (!exists) {
            player.honors.push(honor);
        }
    }
}
