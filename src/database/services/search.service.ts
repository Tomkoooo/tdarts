import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '../models/player.model';
import { TournamentModel } from '../models/tournament.model';
import { ClubModel } from '../models/club.model';

export interface SearchFilters {
    type?: 'players' | 'tournaments' | 'clubs' | 'all';
    status?: string;
    format?: string;
    dateFrom?: Date;
    dateTo?: Date;
    minPlayers?: number;
    maxPlayers?: number;
    location?: string;
    tournamentType?: 'amateur' | 'open';
}

export interface SearchResult {
    players?: any[];
    tournaments?: any[];
    clubs?: any[];
    totalResults: number;
}

export class SearchService {
    static async search(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
        await connectMongo();
        
        const results: SearchResult = {
            totalResults: 0
        };

        // If no query is provided but filters are set, search without text filter
        const searchRegex = query ? new RegExp(query, 'i') : null;

        // Search players
        if (filters.type === 'players' || filters.type === 'all') {
            const playerQuery: any = {};
            
            if (searchRegex) {
                playerQuery.$or = [
                    { name: searchRegex },
                    { 'userRef': { $exists: true } } // Include registered players
                ];
            } else {
                // If no search query and type is 'players', don't return any players
                // This prevents showing all players when no search is performed
                if (filters.type === 'players') {
                    // Don't add any query, so no players will be returned
                } else {
                    // If type is 'all', get all players
                    playerQuery['userRef'] = { $exists: true };
                }
            }

            const players = await PlayerModel.find(playerQuery)
                .populate('userRef', 'name email')
                .limit(20)
                .sort({ name: 1 });

            results.players = players.map(player => ({
                _id: player._id,
                name: player.name,
                type: 'player',
                userRef: player.userRef,
                stats: player.stats || {},
                tournamentHistory: player.tournamentHistory || []
            }));
        }

        // Search tournaments
        if (filters.type === 'tournaments' || filters.type === 'all') {
            const tournamentQuery: any = {};
            
            if (searchRegex) {
                tournamentQuery.$or = [
                    { 'tournamentSettings.name': searchRegex },
                    { 'tournamentSettings.description': searchRegex },
                    { 'tournamentSettings.location': searchRegex },
                    { tournamentId: searchRegex }
                ];
            } else {
                // If no search query and type is 'tournaments', don't return any tournaments
                if (filters.type === 'tournaments') {
                    // Don't add any query, so no tournaments will be returned
                }
            }

            // Apply tournament filters
            if (filters.status) {
                tournamentQuery['tournamentSettings.status'] = filters.status;
            }
            if (filters.format) {
                tournamentQuery['tournamentSettings.format'] = filters.format;
            }
            if (filters.dateFrom || filters.dateTo) {
                tournamentQuery['tournamentSettings.startDate'] = {};
                if (filters.dateFrom) {
                    tournamentQuery['tournamentSettings.startDate'].$gte = filters.dateFrom;
                }
                if (filters.dateTo) {
                    tournamentQuery['tournamentSettings.startDate'].$lte = filters.dateTo;
                }
            }
            if (filters.minPlayers || filters.maxPlayers) {
                tournamentQuery['tournamentSettings.maxPlayers'] = {};
                if (filters.minPlayers) {
                    tournamentQuery['tournamentSettings.maxPlayers'].$gte = filters.minPlayers;
                }
                if (filters.maxPlayers) {
                    tournamentQuery['tournamentSettings.maxPlayers'].$lte = filters.maxPlayers;
                }
            }
            if (filters.tournamentType) {
                tournamentQuery['tournamentSettings.type'] = filters.tournamentType;
            }

            const tournaments = await TournamentModel.find(tournamentQuery)
                .populate('clubId', 'name location')
                .populate('tournamentPlayers.playerReference', 'name')
                .limit(20)
                .sort({ 'tournamentSettings.startDate': -1 });

            results.tournaments = tournaments.map(tournament => {
                const startDate = tournament.tournamentSettings?.startDate;
                const registrationDeadline = tournament.tournamentSettings?.registrationDeadline;
                const now = new Date();
                
                // Determine if registration is open based on deadline or start date
                let registrationOpen = true;
                
                if (registrationDeadline) {
                    registrationOpen = registrationOpen && now < new Date(registrationDeadline);
                } else if (startDate) {
                    registrationOpen = registrationOpen && now < new Date(startDate.getTime() - 60 * 60 * 1000); // 1 hour before start
                }

                return {
                    registrationOpen: registrationOpen,
                    tournament: tournament,
                };
            });
        }

        // Search clubs
        if (filters.type === 'clubs' || filters.type === 'all') {
            const clubQuery: any = {};
            
            if (searchRegex) {
                clubQuery.$or = [
                    { name: searchRegex },
                    { description: searchRegex },
                    { location: searchRegex }
                ];
            } else {
                // If no search query and type is 'clubs', don't return any clubs
                if (filters.type === 'clubs') {
                    // Don't add any query, so no clubs will be returned
                }
            }

            // Apply club filters
            if (filters.location) {
                clubQuery.location = new RegExp(filters.location, 'i');
            }

            const clubs = await ClubModel.find(clubQuery)
                .populate('members', 'name email')
                .populate('moderators', 'name email')
                .limit(20)
                .sort({ name: 1 });

            results.clubs = clubs.map(club => ({
                _id: club._id,
                name: club.name,
                description: club.description,
                location: club.location,
                memberCount: club.members?.length || 0,
                moderatorCount: club.moderators?.length || 0,
                boardCount: club.boards?.length || 0,
                type: 'club'
            }));
        }

        // Calculate total results
        results.totalResults = (results.players?.length || 0) + 
                              (results.tournaments?.length || 0) + 
                              (results.clubs?.length || 0);

        return results;
    }

    static async getSearchSuggestions(query: string): Promise<string[]> {
        await connectMongo();
        
        const suggestions: string[] = [];
        const searchRegex = new RegExp(query, 'i');

        // Get player name suggestions
        const playerNames = await PlayerModel.find({ name: searchRegex })
            .select('name')
            .limit(5)
            .sort({ name: 1 });
        
        suggestions.push(...playerNames.map(p => p.name));

        // Get tournament name suggestions
        const tournamentNames = await TournamentModel.find({ 'tournamentSettings.name': searchRegex })
            .select('tournamentSettings.name')
            .limit(5)
            .sort({ 'tournamentSettings.name': 1 });
        
        suggestions.push(...tournamentNames.map(t => t.tournamentSettings?.name).filter(Boolean));

        // Get club name suggestions
        const clubNames = await ClubModel.find({ name: searchRegex })
            .select('name')
            .limit(5)
            .sort({ name: 1 });
        
        suggestions.push(...clubNames.map(c => c.name));

        // Remove duplicates and limit to 10 suggestions
        return [...new Set(suggestions)].slice(0, 10);
    }

    static async getRecentTournaments(limit: number = 5): Promise<any[]> {
        await connectMongo();
        
        return await TournamentModel.find()
            .populate('clubId', 'name location')
            .sort({ 'tournamentSettings.startDate': -1 })
            .limit(limit);
    }

    static async getTopPlayers(limit: number = 10, skip: number = 0): Promise<{ players: any[], total: number }> {
        await connectMongo();
        
        // Get total count
        const total = await PlayerModel.countDocuments({ 
            $or: [
                { $expr: { $gt: [ { $size: { $ifNull: ['$tournamentHistory', []] } }, 0 ] } }
            ]
        });
        
        // Get players with pagination
        const players = await PlayerModel.find({ 
            $or: [
                { $expr: { $gt: [ { $size: { $ifNull: ['$tournamentHistory', []] } }, 0 ] } }
            ]
        })
        .sort({ 
            'stats.bestPosition': 1, 
            'stats.averagePosition': 1,
            'stats.tournamentsPlayed': -1 
        })
        .skip(skip)
        .limit(limit);
        
        return { players, total };
    }

    static async getPopularClubs(limit: number = 5): Promise<any[]> {
        await connectMongo();
        
        return await ClubModel.aggregate([
            {
                $addFields: {
                    memberCount: { $size: { $ifNull: ['$members', []] } }
                }
            },
            {
                $sort: { memberCount: -1 }
            },
            {
                $limit: limit
            }
        ]);
    }
} 