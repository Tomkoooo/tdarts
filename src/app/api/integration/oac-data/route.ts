import { NextRequest, NextResponse } from 'next/server';

import { MatchModel } from '@/database/models/match.model';
import { LeagueModel } from '@/database/models/league.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { connectMongo } from '@/lib/mongoose';
import { LogModel } from '@/database/models/log.model';
import { ClubModel } from '@/database/models/club.model';

// Utility to process growth data
function getGrowthData(items: any[]) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setDate(1); // Start of month

    // Filter items created in the last 6 months
    const recentItems = items.filter(item => new Date(item.createdAt) >= sixMonthsAgo);

    // Group by Month
    const monthlyCounts: { [key: string]: number } = {};
    
    // Initialize months
    const monthKeys = [];
    for(let i=0; i<6; i++) {
        const d = new Date(sixMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const key = d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'short' });
        monthlyCounts[key] = 0;
        monthKeys.push(key);
    }

    // Determine baseline count (items created BEFORE the 6 month window)
    let runningTotal = items.filter(item => new Date(item.createdAt) < sixMonthsAgo).length;

    // Sort items by date
    recentItems.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Iterate through months and add up
    const result = [];
    
    for(let i=0; i<monthKeys.length; i++) {
        const d = new Date(sixMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const label = monthKeys[i];
        
        // Find items in this month
        const nextMonth = new Date(d);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const countInMonth = items.filter(item => {
            const c = new Date(item.createdAt);
            return c >= d && c < nextMonth;
        }).length;

        runningTotal += countInMonth;
        result.push({ name: label, value: runningTotal });
    }

    // Always ensure current month is up to date
    return result;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
    try {
        await connectMongo();

        // 1. Find OAC Leagues
        const oacLeagues = await LeagueModel.find({ 
            verified: true,
            isActive: true 
        })
            .populate('club', 'name city')
            .populate('players.player', 'name email')
            .lean();

        // 2. Get Verified OAC Tournaments (Active/Finished)
        const verifiedTournaments = await TournamentModel.find({
            verified: true,
            isDeleted: false,
            isCancelled: false,
        }).select('_id name startDate createdAt school').lean();

        const verifiedTournamentIds = verifiedTournaments.map(t => t._id);

        // 3. Unique Players Count
        const uniquePlayersPipeline = [
            { 
                $match: { 
                    tournamentRef: { $in: verifiedTournamentIds },
                } 
            },
            {
                $project: {
                    players: ["$player1.playerId", "$player2.playerId"]
                }
            },
            {
                $unwind: "$players"
            },
            {
                $match: {
                    players: { $ne: null }
                }
            },
            {
                $group: {
                    _id: null,
                    uniquePlayers: { $addToSet: "$players" }
                }
            }
        ];

        const uniquePlayersResult = await MatchModel.aggregate(uniquePlayersPipeline);
        let uniquePlayerCount = 0;
        if (uniquePlayersResult.length > 0 && uniquePlayersResult[0].uniquePlayers) {
             const playerIds = uniquePlayersResult[0].uniquePlayers.filter((id: any) => id);
             uniquePlayerCount = playerIds.length;
        }

        // 4. Integrity Stats (Manual Overrides)
        // Aggregation to find tournaments with most overrides
        const integrityAggregation = await MatchModel.aggregate([
            {
                $match: {
                    manualOverride: true,
                    // Optionally restrict to verified tournaments if needed, but integrity checks usually global
                    tournamentRef: { $in: verifiedTournamentIds }
                }
            },
            {
                $group: {
                    _id: "$tournamentRef",
                    count: { $sum: 1 },
                    // matches: { $push: { _id: "$_id", reason: "$manualChangeType", user: "$manualChangedBy" } }
                }
            },
            {
                $lookup: {
                    from: "tournaments",
                    localField: "_id",
                    foreignField: "_id",
                    as: "tournament"
                }
            },
            {
                $unwind: "$tournament"
            },
            {
                $project: {
                    tournamentName: "$tournament.name",
                    tournamentId: "$_id",
                    overrideCount: "$count",
                }
            },
            { $sort: { overrideCount: -1 } },
            { $limit: 10 }
        ]);

        const suspiciousMatches = await MatchModel.find({ 
            manualOverride: true,
            tournamentRef: { $in: verifiedTournamentIds }
        })
            .populate('tournamentRef', 'name')
            .populate('player1.playerId', 'name email')
            .populate('player2.playerId', 'name email')
            .populate('winnerId', 'name')
            .populate('manualChangedBy', 'name email')
            .sort({ overrideTimestamp: -1 })
            .limit(50)
            .lean();

        // 5. Global Stats
        const totalLeagues = oacLeagues.length;
        const totalTournaments = verifiedTournaments.length;
        const verifiedClubs = await ClubModel.find({ verified: true, isActive: true }).select('createdAt name').lean();
        const verifiedClubsCount = verifiedClubs.length;

        // 6. Activity Feed (Logs) - Filtered (No Errors)
        const recentLogs = await LogModel.find({
            category: { $in: ['auth', 'club', 'tournament', 'system'] },
            level: { $ne: 'error' } 
        })
        .sort({ timestamp: -1 })
        .limit(20)
        .lean();

        // 7. Pending Applications
        const pendingApplications = await ClubModel.find({
            verified: false,
            isActive: true 
        }).select('name description location createdAt contact').sort({ createdAt: -1 }).limit(10).lean();

        // 8. Growth Stats
        const clubGrowth = getGrowthData(verifiedClubs);
        const tournamentGrowth = getGrowthData(verifiedTournaments);

        return NextResponse.json({
            // Integrity Data
            integrityStats: {
                topOffendingTournaments: integrityAggregation,
                suspiciousMatches: suspiciousMatches,
            },
            // Dashboard Data
            globalStats: { 
                totalLeagues, 
                totalTournaments, 
                totalPlayers: uniquePlayerCount,
                verifiedClubCount: verifiedClubsCount
            },
            growthStats: {
                clubs: clubGrowth,
                tournaments: tournamentGrowth
            },
            recentLogs: recentLogs.map((log: any) => ({
                id: log._id,
                user: {
                    name: log.userRole || 'System',
                    email: log.category,
                    image: null
                },
                action: log.message,
                date: new Date(log.timestamp).toLocaleTimeString('hu-HU', { hour: '2-digit', minute:'2-digit' }),
                type: log.level === 'warn' ? 'warning' : 'info'
            })),
            pendingApplications: pendingApplications.map((app: any) => ({
                _id: app._id,
                clubName: app.name,
                status: 'submitted',
                submittedAt: app.createdAt
            })),
        }, { status: 200 });

    } catch (error) {
        console.error('Error in OAC Data Integration:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
