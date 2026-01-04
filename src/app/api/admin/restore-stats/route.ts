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
            // STRATEGY: Replay tournament history chronologically with incremental stat updates
            
            // 1. Gather ALL history from current and archived seasons
            const currentHistory = [...(player.tournamentHistory || [])];
            const archivedHistories = (player.previousSeasons || []).flatMap((ps: any) => 
                (ps.tournamentHistory || []).map((t: any) => ({ ...t, _fromArchive: ps.year }))
            );
            
            const fullHistory = [...currentHistory, ...archivedHistories];
            
            // Sort chronologically for accurate MMR replay
            fullHistory.sort((a: any, b: any) => new Date(a.date || a.startDate).getTime() - new Date(b.date || b.startDate).getTime());

            // 2. Reset player to baseline state (as if starting fresh)
            let currentMMR = 800;
            let globalAvg = 0;
            let globalAvgPos = 0;
            let globalTournaments = 0;
            let globalMatchesWon = 0;
            let globalMatchesLost = 0;
            let globalLegsWon = 0;
            let globalLegsLost = 0;
            let global180s = 0;
            let globalHighCheckout = 0;
            let globalBestPos = 999;

            // Track target year stats separately
            const targetYear = year;
            let yearTournaments = 0;
            let yearAvgSum = 0;
            let yearPosSum = 0;
            let yearBestPos = 999;

            // 3. Replay each tournament with incremental stat updates
            for (const t of fullHistory) {
                const tDate = new Date(t.date || t.startDate);
                const tYear = tDate.getFullYear();
                const isTargetYear = tYear === targetYear;

                if (!t.stats) {
                    console.warn(`Tournament ${t.tournamentId} missing stats, skipping MMR calc`);
                    continue;
                }

                // === INCREMENTAL STAT UPDATES (like finishTournament) ===
                
                // Update weighted average (incremental)
                if (globalTournaments > 0) {
                    globalAvg = ((globalAvg * globalTournaments) + (t.stats.average || 0)) / (globalTournaments + 1);
                    globalAvgPos = ((globalAvgPos * globalTournaments) + t.position) / (globalTournaments + 1);
                } else {
                    globalAvg = t.stats.average || 0;
                    globalAvgPos = t.position;
                }

                // Update counters
                globalTournaments++;
                globalMatchesWon += t.stats.matchesWon || 0;
                globalMatchesLost += t.stats.matchesLost || 0;
                globalLegsWon += t.stats.legsWon || 0;
                globalLegsLost += t.stats.legsLost || 0;
                global180s += t.stats.oneEightiesCount || (t.stats as any).total180s || 0;
                
                if ((t.stats.highestCheckout || 0) > globalHighCheckout) {
                    globalHighCheckout = t.stats.highestCheckout;
                }
                if (t.position < globalBestPos) {
                    globalBestPos = t.position;
                }

                // Track year-specific stats
                if (isTargetYear) {
                    yearTournaments++;
                    yearAvgSum += t.stats.average || 0;
                    yearPosSum += t.position;
                    if (t.position < yearBestPos) yearBestPos = t.position;
                }

                // === MMR CALCULATION (with current global stats as context) ===
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
                    45 // Baseline average
                );

                // Store MMR change and update current MMR
                t.mmrChange = newMMR - currentMMR;
                currentMMR = newMMR;

                // OAC MMR would also be calculated here if verified tournaments
                // For now, keeping it simple
            }

            // 4. Calculate final derived stats
            const finalYearAvg = yearTournaments > 0 ? Number((yearAvgSum / yearTournaments).toFixed(2)) : 0;
            const finalYearAvgPos = yearTournaments > 0 ? Number((yearPosSum / yearTournaments).toFixed(2)) : 0;

            // 5. Redistribute History back to Current and Archives (with updated mmrChange)
            player.tournamentHistory = fullHistory
                .filter(t => {
                    // Only include tournaments from targetYear or later in current history
                    const tYear = new Date(t.date || t.startDate).getFullYear();
                    return !t._fromArchive || tYear >= targetYear;
                })
                .map(t => {
                    //eslint-disable-next-line
                    const { _fromArchive, ...cleanT } = t;
                    return cleanT;
                });

            // Update archives with fixed mmrChange
            if (player.previousSeasons) {
                player.previousSeasons.forEach((ps: any) => {
                    // Only keep archives for years before the target year
                    if (ps.year < targetYear) {
                        ps.tournamentHistory = fullHistory
                            .filter(t => {
                                const tYear = new Date(t.date || t.startDate).getFullYear();
                                return tYear === ps.year;
                            })
                            .map(t => {
                                //eslint-disable-next-line
                                const { _fromArchive, ...cleanT } = t;
                                return cleanT;
                            });
                    }
                });
                
                // Remove archive entries for targetYear and later (they're in current history now)
                player.previousSeasons = player.previousSeasons.filter((ps: any) => ps.year < targetYear);
            }

            // 6. Update Player Stats (final state after all tournaments)
            player.stats = {
                tournamentsPlayed: globalTournaments,
                matchesPlayed: globalMatchesWon + globalMatchesLost,
                legsWon: globalLegsWon,
                legsLost: globalLegsLost,
                oneEightiesCount: global180s,
                highestCheckout: globalHighCheckout,
                avg: finalYearAvg, // Use target year average for display
                averagePosition: finalYearAvgPos, // Use target year position for display
                bestPosition: globalBestPos,
                totalMatchesWon: globalMatchesWon,
                totalMatchesLost: globalMatchesLost,
                totalLegsWon: globalLegsWon,
                totalLegsLost: globalLegsLost,
                total180s: global180s,
                mmr: currentMMR,
                oacMmr: (player.stats as any).oacMmr || 800,
            };

            // Remove Honors for targetYear and later
            if (player.honors) {
                player.honors = player.honors.filter((h: any) => h.year < targetYear);
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
