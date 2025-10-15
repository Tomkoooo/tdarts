const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB connection
async function connectToDatabase() {
    try {
        // Use the same connection method as the application
        const dbName = 'tdarts_v2'
        
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: dbName,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('✅ Connected to MongoDB:', process.env.MONGODB_URI);
        console.log(`📊 Using database: ${mongoose.connection.db.databaseName}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// MMR Service simulation (simplified version)
class MMRService {
    static getInitialMMR() {
        return 800;
    }

    static calculateMMRChange(currentMMR, placement, totalPlayers, matchWinRate, legWinRate, average, tournamentAverage) {
        // Simplified MMR calculation - you can adjust this logic
        const baseChange = 50;
        const placementFactor = (totalPlayers - placement + 1) / totalPlayers;
        const winRateFactor = (matchWinRate + legWinRate) / 2;
        const averageFactor = average > 0 ? Math.min(average / 100, 2) : 0.5;
        
        const change = baseChange * placementFactor * winRateFactor * averageFactor;
        
        // Add some randomness and cap the change
        const finalChange = Math.max(-100, Math.min(100, change));
        
        return Math.max(400, Math.min(2000, currentMMR + finalChange));
    }
}

// Get elimination text
function getEliminationText(placement, format) {
    if (placement === 1) return 'winner';
    if (placement === 2) return 'final';
    if (placement <= 4) return 'semi-final';
    if (placement <= 8) return 'quarter-final';
    if (format === 'knockout') {
        const rounds = Math.ceil(Math.log2(placement));
        return `round-${rounds}`;
    }
    return 'group';
}

// Reset all player statistics
async function resetAllPlayerStats() {
    try {
        console.log('🔄 Resetting all player statistics...');
        
        const playersCollection = mongoose.connection.db.collection('players');
        
        // Reset all player stats to initial values
        const resetResult = await playersCollection.updateMany(
            {}, // All players
            {
                $set: {
                    'stats.tournamentsPlayed': 0,
                    'stats.matchesPlayed': 0,
                    'stats.legsWon': 0,
                    'stats.legsLost': 0,
                    'stats.oneEightiesCount': 0,
                    'stats.highestCheckout': 0,
                    'stats.avg': 0,
                    'stats.averagePosition': 0,
                    'stats.bestPosition': 999,
                    'stats.totalMatchesWon': 0,
                    'stats.totalMatchesLost': 0,
                    'stats.totalLegsWon': 0,
                    'stats.totalLegsLost': 0,
                    'stats.total180s': 0,
                    'stats.mmr': 800,
                    'tournamentHistory': []
                }
            }
        );
        
        console.log(`✅ Reset ${resetResult.modifiedCount} players' statistics`);
        return true;
    } catch (error) {
        console.error('❌ Error resetting player stats:', error);
        return false;
    }
}

// Process all finished tournaments
async function processAllTournaments() {
    try {
        console.log('🏆 Processing all finished tournaments...');
        
        const tournamentsCollection = mongoose.connection.db.collection('tournaments');
        const playersCollection = mongoose.connection.db.collection('players');
        const matchesCollection = mongoose.connection.db.collection('matches');
        
        // Get all finished tournaments sorted by start date
        const tournaments = await tournamentsCollection.find({
            'tournamentSettings.status': 'finished'
        }).sort({ 'tournamentSettings.startDate': 1 }).toArray();
        
        console.log(`📋 Found ${tournaments.length} finished tournaments`);
        
        for (const tournament of tournaments) {
            console.log(`\n🎯 Processing tournament: ${tournament.tournamentSettings?.name || 'Unknown'} (${tournament.tournamentId})`);
            
            try {
                // Get all finished matches for this tournament
                const allMatches = await matchesCollection.find({
                    tournamentRef: tournament._id,
                    status: 'finished',
                    winnerId: { $exists: true, $ne: null }
                }).toArray();
                
                console.log(`  📊 Found ${allMatches.length} finished matches`);
                
                if (allMatches.length === 0) {
                    console.log(`  ⚠️ No finished matches found, skipping tournament`);
                    continue;
                }
                
                // Calculate statistics for each player
                const playerStats = new Map();
                
                for (const match of allMatches) {
                    const player1Id = match.player1?.playerId?.toString();
                    const player2Id = match.player2?.playerId?.toString();
                    
                    if (!player1Id || !player2Id) continue;
                    
                    // Initialize player stats if not exists
                    if (!playerStats.has(player1Id)) {
                        playerStats.set(player1Id, {
                            matchesPlayed: 0,
                            matchesWon: 0,
                            legsPlayed: 0,
                            legsWon: 0,
                            oneEighties: 0,
                            highestCheckout: 0,
                            tournamentTotal: 0,
                            tournamentMatches: 0
                        });
                    }
                    
                    if (!playerStats.has(player2Id)) {
                        playerStats.set(player2Id, {
                            matchesPlayed: 0,
                            matchesWon: 0,
                            legsPlayed: 0,
                            legsWon: 0,
                            oneEighties: 0,
                            highestCheckout: 0,
                            tournamentTotal: 0,
                            tournamentMatches: 0
                        });
                    }
                    
                    const p1Stats = playerStats.get(player1Id);
                    const p2Stats = playerStats.get(player2Id);
                    
                    // Update match statistics
                    p1Stats.matchesPlayed++;
                    p2Stats.matchesPlayed++;
                    
                    if (match.winnerId?.toString() === player1Id) {
                        p1Stats.matchesWon++;
                    } else {
                        p2Stats.matchesWon++;
                    }
                    
                    // Process legs
                    if (match.legs && Array.isArray(match.legs)) {
                        for (const leg of match.legs) {
                            if (leg.player1Throws && Array.isArray(leg.player1Throws)) {
                                p1Stats.legsPlayed++;
                                if (leg.winnerId?.toString() === player1Id) {
                                    p1Stats.legsWon++;
                                }
                                
                                // Calculate match average for player1
                                let totalScore = 0;
                                let totalThrows = 0;
                                let oneEighties = 0;
                                let highestCheckout = 0;
                                
                                for (const throwData of leg.player1Throws) {
                                    totalScore += throwData.score || 0;
                                    totalThrows += throwData.darts || 0;
                                    if (throwData.score === 180) oneEighties++;
                                    if (throwData.isCheckout && throwData.score > highestCheckout) {
                                        highestCheckout = throwData.score;
                                    }
                                }
                                
                                if (totalThrows > 0) {
                                    const matchAverage = (totalScore / totalThrows) * 3; // Three-dart average
                                    p1Stats.tournamentTotal += matchAverage;
                                    p1Stats.tournamentMatches++;
                                }
                                
                                p1Stats.oneEighties += oneEighties;
                                if (highestCheckout > p1Stats.highestCheckout) {
                                    p1Stats.highestCheckout = highestCheckout;
                                }
                            }
                            
                            if (leg.player2Throws && Array.isArray(leg.player2Throws)) {
                                p2Stats.legsPlayed++;
                                if (leg.winnerId?.toString() === player2Id) {
                                    p2Stats.legsWon++;
                                }
                                
                                // Calculate match average for player2
                                let totalScore = 0;
                                let totalThrows = 0;
                                let oneEighties = 0;
                                let highestCheckout = 0;
                                
                                for (const throwData of leg.player2Throws) {
                                    totalScore += throwData.score || 0;
                                    totalThrows += throwData.darts || 0;
                                    if (throwData.score === 180) oneEighties++;
                                    if (throwData.isCheckout && throwData.score > highestCheckout) {
                                        highestCheckout = throwData.score;
                                    }
                                }
                                
                                if (totalThrows > 0) {
                                    const matchAverage = (totalScore / totalThrows) * 3; // Three-dart average
                                    p2Stats.tournamentTotal += matchAverage;
                                    p2Stats.tournamentMatches++;
                                }
                                
                                p2Stats.oneEighties += oneEighties;
                                if (highestCheckout > p2Stats.highestCheckout) {
                                    p2Stats.highestCheckout = highestCheckout;
                                }
                            }
                        }
                    }
                    
                    // Add match-level statistics if available
                    if (match.player1?.average) {
                        p1Stats.tournamentTotal += match.player1.average;
                        p1Stats.tournamentMatches++;
                    }
                    if (match.player2?.average) {
                        p2Stats.tournamentTotal += match.player2.average;
                        p2Stats.tournamentMatches++;
                    }
                    
                    if (match.player1?.oneEightiesCount) {
                        p1Stats.oneEighties += match.player1.oneEightiesCount;
                    }
                    if (match.player2?.oneEightiesCount) {
                        p2Stats.oneEighties += match.player2.oneEightiesCount;
                    }
                    
                    if (match.player1?.highestCheckout && match.player1.highestCheckout > p1Stats.highestCheckout) {
                        p1Stats.highestCheckout = match.player1.highestCheckout;
                    }
                    if (match.player2?.highestCheckout && match.player2.highestCheckout > p2Stats.highestCheckout) {
                        p2Stats.highestCheckout = match.player2.highestCheckout;
                    }
                }
                
                // Calculate tournament average for MMR calculation
                let tournamentAverageScore = 0;
                if (playerStats.size > 0) {
                    const totalAvg = Array.from(playerStats.values()).reduce((sum, s) => {
                        return sum + (s.tournamentMatches > 0 ? s.tournamentTotal / s.tournamentMatches : 0);
                    }, 0);
                    tournamentAverageScore = totalAvg / playerStats.size;
                }
                
                // Calculate standings (simplified - based on matches won)
                const standings = Array.from(playerStats.entries())
                    .sort((a, b) => b[1].matchesWon - a[1].matchesWon)
                    .map(([playerId], index) => ({ playerId, standing: index + 1 }));
                
                const totalPlayers = tournament.tournamentPlayers?.length || playerStats.size;
                
                console.log(`  📈 Processing ${playerStats.size} players`);
                
                // Update each player's statistics
                for (const [playerId, stats] of playerStats) {
                    const player = await playersCollection.findOne({ _id: new mongoose.Types.ObjectId(playerId) });
                    if (!player) {
                        console.log(`    ⚠️ Player ${playerId} not found, skipping`);
                        continue;
                    }
                    
                    // Calculate tournament average
                    const tournamentAverage = stats.tournamentMatches > 0 ? stats.tournamentTotal / stats.tournamentMatches : 0;
                    
                    // Find player's standing
                    const playerStanding = standings.find(s => s.playerId === playerId);
                    const placement = playerStanding?.standing || totalPlayers;
                    
                    // Update tournament history
                    const tournamentHistory = {
                        tournamentId: tournament.tournamentId,
                        tournamentName: tournament.tournamentSettings?.name || 'Unknown Tournament',
                        position: placement,
                        eliminatedIn: getEliminationText(placement, tournament.tournamentSettings?.format || 'group'),
                        stats: {
                            matchesWon: stats.matchesWon,
                            matchesLost: stats.matchesPlayed - stats.matchesWon,
                            legsWon: stats.legsWon,
                            legsLost: stats.legsPlayed - stats.legsWon,
                            oneEightiesCount: stats.oneEighties,
                            highestCheckout: stats.highestCheckout,
                            average: tournamentAverage,
                        },
                        date: tournament.tournamentSettings?.startDate || new Date()
                    };
                    
                    // Get current player stats or initialize
                    const currentStats = player.stats || {
                        tournamentsPlayed: 0,
                        matchesPlayed: 0,
                        legsWon: 0,
                        legsLost: 0,
                        oneEightiesCount: 0,
                        highestCheckout: 0,
                        avg: 0,
                        averagePosition: 0,
                        bestPosition: 999,
                        totalMatchesWon: 0,
                        totalMatchesLost: 0,
                        totalLegsWon: 0,
                        totalLegsLost: 0,
                        total180s: 0,
                        mmr: 800
                    };
                    
                    // Update overall statistics
                    const newStats = {
                        tournamentsPlayed: currentStats.tournamentsPlayed + 1,
                        matchesPlayed: currentStats.matchesPlayed + stats.matchesPlayed,
                        legsWon: currentStats.legsWon + stats.legsWon,
                        legsLost: currentStats.legsLost + stats.legsLost,
                        totalMatchesWon: currentStats.totalMatchesWon + stats.matchesWon,
                        totalMatchesLost: currentStats.totalMatchesLost + (stats.matchesPlayed - stats.matchesWon),
                        totalLegsWon: currentStats.totalLegsWon + stats.legsWon,
                        totalLegsLost: currentStats.totalLegsLost + (stats.legsPlayed - stats.legsWon),
                        total180s: currentStats.total180s + stats.oneEighties,
                        oneEightiesCount: currentStats.oneEightiesCount + stats.oneEighties,
                        highestCheckout: Math.max(currentStats.highestCheckout || 0, stats.highestCheckout || 0),
                        bestPosition: Math.min(currentStats.bestPosition || 999, placement),
                        mmr: currentStats.mmr || 800
                    };
                    
                    // Calculate MMR change
                    const matchWinRate = stats.matchesPlayed > 0 ? stats.matchesWon / stats.matchesPlayed : 0;
                    const legWinRate = stats.legsPlayed > 0 ? stats.legsWon / stats.legsPlayed : 0;
                    
                    const newMMR = MMRService.calculateMMRChange(
                        newStats.mmr,
                        placement,
                        totalPlayers,
                        matchWinRate,
                        legWinRate,
                        tournamentAverage,
                        tournamentAverageScore
                    );
                    
                    newStats.mmr = Math.ceil(newMMR); // Felfelé kerekítés tizedesjegyek nélkül
                    
                    // Calculate all-time average from tournament history
                    const allTournamentHistory = [...(player.tournamentHistory || []), tournamentHistory];
                    if (allTournamentHistory.length > 0) {
                        const totalAvg = allTournamentHistory.reduce((sum, hist) => sum + (hist.stats?.average || 0), 0);
                        newStats.avg = totalAvg / allTournamentHistory.length;
                        
                        // Calculate average position
                        const totalPosition = allTournamentHistory.reduce((sum, hist) => sum + hist.position, 0);
                        newStats.averagePosition = totalPosition / allTournamentHistory.length;
                    } else {
                        newStats.avg = tournamentAverage;
                        newStats.averagePosition = placement;
                    }
                    
                    // Update player document - first update stats
                    await playersCollection.updateOne(
                        { _id: new mongoose.Types.ObjectId(playerId) },
                        {
                            $set: {
                                stats: newStats
                            }
                        }
                    );
                    
                    // Then add to tournament history
                    await playersCollection.updateOne(
                        { _id: new mongoose.Types.ObjectId(playerId) },
                        {
                            $push: { tournamentHistory: tournamentHistory }
                        }
                    );
                    
                    console.log(`    ✅ ${player.name}: ${stats.matchesWon}W/${stats.matchesPlayed - stats.matchesWon}L, Avg: ${tournamentAverage.toFixed(1)}, MMR: ${currentStats.mmr || 800} → ${Math.ceil(newMMR)}`);
                }
                
                console.log(`  ✅ Tournament processed successfully`);
                
            } catch (tournamentError) {
                console.error(`  ❌ Error processing tournament ${tournament.tournamentId}:`, tournamentError);
                continue;
            }
        }
        
        console.log('\n🎉 All tournaments processed successfully!');
        return true;
        
    } catch (error) {
        console.error('❌ Error processing tournaments:', error);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting complete player statistics reset and recalculation...\n');
    
    try {
        await connectToDatabase();
        
        // Step 1: Reset all player statistics
        const resetSuccess = await resetAllPlayerStats();
        if (!resetSuccess) {
            console.error('❌ Failed to reset player statistics');
            process.exit(1);
        }
        
        // Step 2: Process all finished tournaments
        const processSuccess = await processAllTournaments();
        if (!processSuccess) {
            console.error('❌ Failed to process tournaments');
            process.exit(1);
        }
        
        console.log('\n✅ Complete player statistics reset and recalculation finished successfully!');
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { resetAllPlayerStats, processAllTournaments };
