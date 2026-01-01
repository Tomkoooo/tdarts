import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { PlayerModel } from "@/database/models/player.model";
import jwt from 'jsonwebtoken';
import { UserModel } from "@/database/models/user.model";

export async function POST(req: NextRequest) {
    try {
        // Auth Check
        const token = req.cookies.get('token')?.value;
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
        await connectMongo();
        
        const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
        if (!adminUser?.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const { year } = await req.json();

        if (!year) {
            return NextResponse.json({ error: "Year is required" }, { status: 400 });
        }

        const players = await PlayerModel.find({});
        
        // 1. Pre-fetch tournament metadata for MMR calculation (total participants)
        const tournamentIds = new Set<string>();
        players.forEach((p: any) => {
            p.tournamentHistory.forEach((h: any) => tournamentIds.add(h.tournamentId));
        });

        const TournamentModel = (await import("@/database/models/tournament.model")).TournamentModel;
        const tournaments = await TournamentModel.find({ tournamentId: { $in: Array.from(tournamentIds) } })
            .select('tournamentId tournamentPlayers');
        
        const tournamentSizeMap = new Map<string, number>();
        tournaments.forEach((t: any) => {
            tournamentSizeMap.set(t.tournamentId, t.tournamentPlayers?.length || 0);
        });

        // Import MMR Service
        const { MMRService } = await import("@/database/services/mmr.service");

        let restoredCount = 0;

        for (const player of players) {
            // STRATEGY: Re-calculate everything from ALL tournamentHistory (including archived)
            
            // 1. Gather ALL history
            const currentHistory = [...(player.tournamentHistory || [])];
            const archivedHistories = (player.previousSeasons || []).flatMap((ps: any) => 
                (ps.tournamentHistory || []).map((t: any) => ({ ...t, _fromArchive: ps.year }))
            );
            
            const fullHistory = [...currentHistory, ...archivedHistories];
            
            // Sort chronologically for MMR replay
            fullHistory.sort((a: any, b: any) => new Date(a.date || a.startDate).getTime() - new Date(b.date || b.startDate).getTime());

            // 2. Initialize counters for current season (for displays/averages)
            // We'll target the year being "restored" or the current one if not specified
            const targetYear = year;
            let yearTournaments = 0;
            let yearAvgSum = 0;
            let yearAvgCount = 0;
            let yearPosSum = 0;
            let bestPosYear = 999;
            
            // 3. Initialize counters for LIFETIME
            let lifeTournaments = 0;
            let lifeMatchesWon = 0;
            let lifeMatchesLost = 0;
            let lifeLegsWon = 0;
            let lifeLegsLost = 0;
            let life180s = 0;
            let lifeHighCheckout = 0;
            
            // RESET MMR to Base (800) before replaying ENTIRE career
            let currentMMR = 800; 

            // 4. Replay and Aggregate
            for (const t of fullHistory) {
                const tDate = new Date(t.date || t.startDate);
                const isTargetYear = tDate.getFullYear() === targetYear;

                lifeTournaments++;
                
                if (isTargetYear) {
                    yearTournaments++;
                    if (t.position < bestPosYear) bestPosYear = t.position;
                    yearPosSum += t.position;
                }

                if (t.stats) {
                    // Lifetime aggregation
                    lifeMatchesWon += t.stats.matchesWon || 0;
                    lifeMatchesLost += t.stats.matchesLost || 0;
                    lifeLegsWon += t.stats.legsWon || 0;
                    lifeLegsLost += t.stats.legsLost || 0;
                    life180s += t.stats.oneEightiesCount || (t.stats as any).total180s || 0;
                    if ((t.stats.highestCheckout || 0) > lifeHighCheckout) lifeHighCheckout = t.stats.highestCheckout;

                    if (isTargetYear && t.stats.average > 0) {
                        yearAvgSum += t.stats.average;
                        yearAvgCount++;
                    }

                    // MMR RECALCULATION
                    const tSize = tournamentSizeMap.get(t.tournamentId) || 12;
                    const matchesTotal = (t.stats.matchesWon || 0) + (t.stats.matchesLost || 0);
                    const legsTotal = (t.stats.legsWon || 0) + (t.stats.legsLost || 0);

                    const matchWinRate = matchesTotal > 0 ? (t.stats.matchesWon / matchesTotal) : 0;
                    const legWinRate = legsTotal > 0 ? (t.stats.legsWon / legsTotal) : 0;

                    const newMMR = MMRService.calculateMMRChange(
                        currentMMR,
                        t.position,
                        tSize,
                        matchWinRate,
                        legWinRate,
                        t.stats.average || 40,
                        45 
                    );

                    // UPDATE mmrChange in the history entry
                    t.mmrChange = newMMR - currentMMR;
                    currentMMR = newMMR;
                }
            }

            // 5. Derived Season Averages
            const finalYearAvg = yearAvgCount > 0 ? Number((yearAvgSum / yearAvgCount).toFixed(2)) : 0;
            const finalYearAvgPos = yearTournaments > 0 ? Number((yearPosSum / yearTournaments).toFixed(2)) : 0;

            // 6. Redistribute History back to Current and Archives
            // Any entry belonging to targetYear (or later if we are restoring) should stay in currentHistory?
            // Actually, the original logic for "Restore" was to move data BACK from archive.
            
            // Filter entries back to their original locations, but with updated mmrChange
            player.tournamentHistory = fullHistory
                .filter(t => !t._fromArchive || t._fromArchive === targetYear)
                .map(t => {
                    //eslint-disable-next-line
                    const { _fromArchive, ...cleanT } = t;
                    return cleanT;
                });

            // Update archives with fixed history
            if (player.previousSeasons) {
                player.previousSeasons.forEach((ps: any) => {
                    if (ps.year !== targetYear) {
                        ps.tournamentHistory = fullHistory
                            .filter(t => t._fromArchive === ps.year)
                            .map(t => {
                                //eslint-disable-next-line
                                const { _fromArchive, ...cleanT } = t;
                                return cleanT;
                            });
                    }
                });
                
                // Remove the targetYear archive entry as we "restored" it to main history
                player.previousSeasons = player.previousSeasons.filter((ps: any) => ps.year !== targetYear);
            }

            // 7. Update Player Stats Summary
            player.stats = {
                tournamentsPlayed: lifeTournaments,
                matchesPlayed: lifeMatchesWon + lifeMatchesLost,
                legsWon: lifeLegsWon,
                legsLost: lifeLegsLost,
                oneEightiesCount: life180s,
                highestCheckout: lifeHighCheckout,
                avg: finalYearAvg, 
                averagePosition: finalYearAvgPos, 
                bestPosition: bestPosYear === 999 ? 0 : bestPosYear,
                totalMatchesWon: lifeMatchesWon,
                totalMatchesLost: lifeMatchesLost,
                totalLegsWon: lifeLegsWon,
                totalLegsLost: lifeLegsLost,
                total180s: life180s,
                mmr: currentMMR, 
                oacMmr: (player.stats as any).oacMmr || 800, 
            };

            // Remove Honors for this year
            if (player.honors) {
                player.honors = player.honors.filter((h: any) => h.year !== targetYear);
            }

            await player.save();
            restoredCount++;
        }

        return NextResponse.json({ 
            success: true, 
            message: `Emergency Fix Complete: Reconstructed stats and re-calculated MMR for ${restoredCount} players from tournament history.`,
            restoredCount 
        });

    } catch (error: any) {
        console.error("Restore error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
