import { NextRequest, NextResponse } from 'next/server';

import { MatchModel } from '@/database/models/match.model';
import { LeagueModel } from '@/database/models/league.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
    try {
        await connectMongo();

        // 1. Find OAC Leagues (identified by verified: true)
        const oacLeagues = await LeagueModel.find({ 
            verified: true,
            isActive: true 
        })
            .populate('club', 'name city')
            .populate('players.player', 'name email')
            .lean();

        if (!oacLeagues || oacLeagues.length === 0) {
            return NextResponse.json({
                suspiciousMatches: [],
                globalStats: { totalLeagues: 0, totalTournaments: 0, totalMatches: 0, totalPlayers: 0 },
                leagueRankings: []
            }, { status: 200 });
        }

        // Get IDs
        // const oacLeagueIds = oacLeagues.map(l => l._id);
        const oacClubIds = [...new Set(oacLeagues.map((l: any) => l.club?._id?.toString()).filter(Boolean))];
        
        // 2. Get all OAC tournaments (attached to OAC leagues)
        const allOacTournamentIds: any[] = [];
        oacLeagues.forEach((l: any) => {
            if (l.attachedTournaments) {
                l.attachedTournaments.forEach((t: any) => allOacTournamentIds.push(t));
            }
        });
        
        const oacTournaments = await TournamentModel.find({
            _id: { $in: allOacTournamentIds }
        }).select('_id name').lean();
        
        const oacTournamentIds = oacTournaments.map(t => t._id);

        // 3. Suspicious Matches (Manual Overrides) - Only from OAC tournaments
        const suspiciousMatches = await MatchModel.find({ 
            manualOverride: true,
            tournamentRef: { $in: oacTournamentIds }
        })
            .populate('tournamentRef', 'name')
            .populate('player1.playerId', 'name email')
            .populate('player2.playerId', 'name email')
            .populate('winnerId', 'name')
            .sort({ overrideTimestamp: -1 })
            .limit(50)
            .lean();

        // 4. Global Stats - OAC Only
        const totalLeagues = oacLeagues.length;
        const totalTournaments = oacTournamentIds.length;
        const totalMatches = await MatchModel.countDocuments({ 
            tournamentRef: { $in: oacTournamentIds } 
        });
        
        // Count unique players across OAC leagues
        const oacPlayerIds = new Set<string>();
        oacLeagues.forEach((l: any) => {
            l.players?.forEach((p: any) => {
                if (p.player?._id) {
                    oacPlayerIds.add(p.player._id.toString());
                } else if (p.player) {
                    oacPlayerIds.add(p.player.toString());
                }
            });
        });
        const totalPlayers = oacPlayerIds.size;

        // 5. Generate League Rankings - Organized by League
        const leagueRankings = oacLeagues.map((league: any) => {
            // Sort players by totalPoints
            const sortedPlayers = (league.players || [])
                .map((p: any) => ({
                    playerId: p.player?._id?.toString() || p.player?.toString(),
                    name: p.player?.name || 'Unknown',
                    email: p.player?.email || '',
                    totalPoints: p.totalPoints || 0,
                    tournamentsPlayed: p.tournamentPoints?.length || 0
                }))
                .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
                .map((p: any, idx: number) => ({ ...p, position: idx + 1 }));

            return {
                leagueId: league._id.toString(),
                leagueName: league.name,
                clubName: league.club?.name || 'N/A',
                clubCity: league.club?.city || 'N/A',
                playerCount: sortedPlayers.length,
                tournamentCount: league.attachedTournaments?.length || 0,
                players: sortedPlayers
            };
        }).sort((a: any, b: any) => b.playerCount - a.playerCount); // Sort by most active leagues first

        // 6. Aggregate Player Match Stats - OAC Only
        const matchAggregation = await MatchModel.aggregate([
            { $match: { tournamentRef: { $in: oacTournamentIds }, status: "finished" } },
            {
                $facet: {
                    p1Stats: [
                        { $match: { "player1.playerId": { $ne: null } } },
                        {
                            $group: {
                                _id: "$player1.playerId",
                                matchesPlayed: { $sum: 1 },
                                matchesWon: { 
                                    $sum: { $cond: [{ $eq: ["$winnerId", "$player1.playerId"] }, 1, 0] } 
                                },
                                sumAverage: { $sum: "$player1.average" },
                                total180s: { $sum: "$player1.oneEightiesCount" },
                                highestCheckout: { $max: "$player1.highestCheckout" }
                            }
                        }
                    ],
                    p2Stats: [
                        { $match: { "player2.playerId": { $ne: null } } },
                        {
                            $group: {
                                _id: "$player2.playerId",
                                matchesPlayed: { $sum: 1 },
                                matchesWon: { 
                                    $sum: { $cond: [{ $eq: ["$winnerId", "$player2.playerId"] }, 1, 0] } 
                                },
                                sumAverage: { $sum: "$player2.average" },
                                total180s: { $sum: "$player2.oneEightiesCount" },
                                highestCheckout: { $max: "$player2.highestCheckout" }
                            }
                        }
                    ]
                }
            }
        ]);

        // Merge stats
        const statsMap = new Map();
        const mergeStats = (items: any[]) => {
            items.forEach(item => {
                if (!item._id) return;
                // Only include if player is in an OAC league
                if (!oacPlayerIds.has(item._id.toString())) return;
                
                const id = item._id.toString();
                if (!statsMap.has(id)) {
                    statsMap.set(id, {
                        playerId: id,
                        matchesPlayed: 0,
                        matchesWon: 0,
                        sumAverage: 0,
                        total180s: 0,
                        highestCheckout: 0
                    });
                }
                const current = statsMap.get(id);
                current.matchesPlayed += item.matchesPlayed || 0;
                current.matchesWon += item.matchesWon || 0;
                current.sumAverage += item.sumAverage || 0;
                current.total180s += item.total180s || 0;
                current.highestCheckout = Math.max(current.highestCheckout, item.highestCheckout || 0);
            });
        };

        if (matchAggregation[0]) {
            mergeStats(matchAggregation[0].p1Stats || []);
            mergeStats(matchAggregation[0].p2Stats || []);
        }

        // Get player names for match stats
        const playerIdsForMatches = Array.from(statsMap.keys());
        const playersForMatches = await PlayerModel.find({ _id: { $in: playerIdsForMatches } }).select('name email').lean();
        const playerLookup = new Map(playersForMatches.map((p: any) => [p._id.toString(), p]));

        const playerMatchStats = Array.from(statsMap.values()).map(stat => {
            const player = playerLookup.get(stat.playerId);
            return {
                ...stat,
                name: player?.name || 'Unknown',
                email: player?.email || '',
                average: stat.matchesPlayed > 0 ? (stat.sumAverage / stat.matchesPlayed).toFixed(2) : '0.00',
                winRate: stat.matchesPlayed > 0 ? ((stat.matchesWon / stat.matchesPlayed) * 100).toFixed(1) : '0.0'
            };
        }).sort((a, b) => b.matchesPlayed - a.matchesPlayed);

        return NextResponse.json({
            suspiciousMatches,
            globalStats: { 
                totalLeagues, 
                totalTournaments, 
                totalMatches, 
                totalPlayers,
                oacClubCount: oacClubIds.length
            },
            leagueRankings,
            playerMatchStats
        }, { status: 200 });

    } catch (error) {
        console.error('Error in OAC Data Integration:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
