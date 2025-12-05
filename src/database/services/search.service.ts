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
    page?: number;
    limit?: number;
}

export interface SearchResult {
    players?: any[];
    tournaments?: any[];
    clubs?: any[];
    totalResults: number;
    totalPages?: number;
    currentPage?: number;
}

export class SearchService {
    static async search(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
        await connectMongo();
        
        console.log('SearchService.search called with:', { query, filters });
        
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;

        const results: SearchResult = {
            totalResults: 0,
            totalPages: 0,
            currentPage: page
        };

        // If no query is provided but filters are set, search without text filter
        const searchRegex = query ? new RegExp(query, 'i') : null;

        // Search players
        if (filters.type === 'players' || filters.type === 'all') {
            const playerQuery: any = {};
            
            if (searchRegex) {
                // Search for players whose name matches the query (registered or not)
                playerQuery.name = searchRegex;
            }

            console.log('Player search query:', playerQuery);
            
            // Fetch ALL matching players (no limit yet) to sort properly in memory
            // MongoDB sort doesn't handle null/undefined MMR values well
            const players = await PlayerModel.find(playerQuery)
                .populate('userRef', 'name email');
            
            console.log('Found players:', players.length);
            
            // Sort by MMR in memory (handle missing/null MMR values)
            const sortedPlayers = players.sort((a, b) => {
                const aMMR = a.stats?.mmr ?? 800; // Default to base MMR if missing
                const bMMR = b.stats?.mmr ?? 800;
                // Sort DESCENDING by MMR (higher MMR first)
                if (bMMR !== aMMR) return bMMR - aMMR;
                // Then by name ascending
                return a.name.localeCompare(b.name);
            });

            // Calculate total for pagination
            const totalPlayers = sortedPlayers.length;
            if (filters.type === 'players') {
                results.totalResults = totalPlayers;
                results.totalPages = Math.ceil(totalPlayers / limit);
            }

            // Get global ranking position for each player
            const globalRanking = await this.getGlobalPlayerRanking();
            
            // Apply pagination or limit based on type
            const playersToReturn = filters.type === 'players' 
                ? sortedPlayers.slice(skip, skip + limit)
                : sortedPlayers.slice(0, 5);

            results.players = playersToReturn.map(player => {
                const mmr = player.stats?.mmr ?? 800;
                const stats = player.stats || {};
                // Ensure stats has mmr field
                stats.mmr = mmr;
                
                // Find global ranking position
                const globalRank = globalRanking.findIndex(p => p._id.toString() === player._id.toString()) + 1;
                
                return {
                    _id: player._id,
                    name: player.name,
                    type: 'player',
                    userRef: player.userRef,
                    stats: stats,
                    tournamentHistory: player.tournamentHistory || [],
                    mmr: mmr,
                    mmrTier: this.getMMRTier(mmr),
                    globalRank: globalRank || null
                };
            });
        }

        // Search tournaments
        if (filters.type === 'tournaments' || filters.type === 'all') {
            const tournamentQuery: any = {};
            let hasFilters = false;
            
            if (searchRegex) {
                tournamentQuery.$or = [
                    { 'tournamentSettings.name': searchRegex },
                    { 'tournamentSettings.description': searchRegex },
                    { 'tournamentSettings.location': searchRegex },
                    { tournamentId: searchRegex }
                ];
            }

            // Apply tournament filters
            if (filters.status) {
                if (filters.status === 'active') {
                    tournamentQuery['tournamentSettings.status'] = { $in: ['group-stage', 'knockout'] };
                } else {
                    tournamentQuery['tournamentSettings.status'] = filters.status;
                }
                hasFilters = true;
            }
            if (filters.format) {
                tournamentQuery['tournamentSettings.format'] = filters.format;
                hasFilters = true;
            }
            if (filters.dateFrom || filters.dateTo) {
                tournamentQuery['tournamentSettings.startDate'] = {};
                if (filters.dateFrom) {
                    tournamentQuery['tournamentSettings.startDate'].$gte = new Date(filters.dateFrom);
                }
                if (filters.dateTo) {
                    // Set to end of day
                    const endDate = new Date(filters.dateTo);
                    endDate.setHours(23, 59, 59, 999);
                    tournamentQuery['tournamentSettings.startDate'].$lte = endDate;
                }
                hasFilters = true;
            }
            if (filters.minPlayers || filters.maxPlayers) {
                tournamentQuery['tournamentSettings.maxPlayers'] = {};
                if (filters.minPlayers) {
                    tournamentQuery['tournamentSettings.maxPlayers'].$gte = Number(filters.minPlayers);
                }
                if (filters.maxPlayers) {
                    tournamentQuery['tournamentSettings.maxPlayers'].$lte = Number(filters.maxPlayers);
                }
                hasFilters = true;
            }
            if (filters.tournamentType) {
                tournamentQuery['tournamentSettings.type'] = filters.tournamentType;
                hasFilters = true;
            }

            // Only search if we have a query OR filters OR type is 'all' OR 'tournaments'
            if (searchRegex || hasFilters || filters.type === 'all' || filters.type === 'tournaments') {
                // Calculate pagination if in tournaments mode
                if (filters.type === 'tournaments') {
                    const totalTournaments = await TournamentModel.countDocuments(tournamentQuery);
                    results.totalResults = totalTournaments;
                    results.totalPages = Math.ceil(totalTournaments / limit);
                }

                const queryLimit = filters.type === 'tournaments' ? limit : 5;
                const querySkip = filters.type === 'tournaments' ? skip : 0;

                const tournaments = await TournamentModel.find(tournamentQuery)
                    .populate('clubId', 'name location')
                    .populate('tournamentPlayers.playerReference', 'name')
                    .limit(queryLimit)
                    .skip(querySkip)
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
            } else {
                results.tournaments = [];
            }
        }

        // Search clubs
        if (filters.type === 'clubs' || filters.type === 'all') {
            const clubQuery: any = {};
            let hasFilters = false;
            
            if (searchRegex) {
                clubQuery.$or = [
                    { name: searchRegex },
                    { description: searchRegex },
                    { location: searchRegex }
                ];
            }

            // Apply club filters
            if (filters.location) {
                clubQuery.location = new RegExp(filters.location, 'i');
                hasFilters = true;
            }

            // Only search if we have a query OR filters OR type is 'all' OR 'clubs'
            if (searchRegex || hasFilters || filters.type === 'all' || filters.type === 'clubs') {
                // Calculate pagination if in clubs mode
                if (filters.type === 'clubs') {
                    const totalClubs = await ClubModel.countDocuments(clubQuery);
                    results.totalResults = totalClubs;
                    results.totalPages = Math.ceil(totalClubs / limit);
                }

                const queryLimit = filters.type === 'clubs' ? limit : 5;
                const querySkip = filters.type === 'clubs' ? skip : 0;

                const clubs = await ClubModel.find(clubQuery)
                    .populate('members', 'name email')
                    .populate('moderators', 'name email')
                    .limit(queryLimit)
                    .skip(querySkip)
                    .sort({ name: 1 });

                results.clubs = clubs.map(club => ({
                    _id: club._id,
                    name: club.name,
                    description: club.description,
                    location: club.location,
                    memberCount: club.members?.length || 0,
                    moderatorCount: club.moderators?.length || 0,
                    boardCount: 0, // Boards are now managed at tournament level
                    type: 'club'
                }));
            } else {
                results.clubs = [];
            }
        }

        // Calculate total results
        results.totalResults = (results.players?.length || 0) + 
                              (results.tournaments?.length || 0) + 
                              (results.clubs?.length || 0);

        return results;
    }

    private static getMMRTier(mmr: number): { name: string; color: string } {
        if (mmr >= 1600) return { name: 'Elit', color: 'text-error' };
        if (mmr >= 1400) return { name: 'Mester', color: 'text-warning' };
        if (mmr >= 1200) return { name: 'Haladó', color: 'text-info' };
        if (mmr >= 1000) return { name: 'Középhaladó', color: 'text-success' };
        if (mmr >= 800) return { name: 'Kezdő+', color: 'text-primary' };
        return { name: 'Kezdő', color: 'text-base-content' };
    }

    static async getSearchSuggestions(query: string): Promise<string[]> {
        await connectMongo();
        
        const suggestions: string[] = [];
        const searchRegex = new RegExp(query, 'i');

        // Get player name suggestions (all players)
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

    static async getAllTournaments(limit: number = 100): Promise<any[]> {
        await connectMongo();
        
        return await TournamentModel.find()
            .populate('clubId', 'name location')
            .populate('tournamentPlayers.playerReference', 'name')
            .sort({ 'tournamentSettings.startDate': -1 })
            .limit(limit);
    }

    static async getTodaysTournaments(): Promise<any[]> {
        await connectMongo();
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        return await TournamentModel.find({
            'tournamentSettings.startDate': {
                $gte: today,
                $lt: tomorrow
            }
        })
            .populate('clubId', 'name location')
            .populate('tournamentPlayers.playerReference', 'name')
            .sort({ 'tournamentSettings.startDate': 1 });
    }

    static async getActiveTournaments(): Promise<any[]> {
        await connectMongo();
        
        return await TournamentModel.find({
            'tournamentSettings.status': { $in: ['group-stage', 'knockout'] }
        })
            .populate('clubId', 'name location')
            .populate('tournamentPlayers.playerReference', 'name')
            .sort({ 'tournamentSettings.startDate': -1 })
            .limit(50);
    }

    static async getFinishedTournaments(limit: number = 50): Promise<any[]> {
        await connectMongo();
        
        return await TournamentModel.find({
            'tournamentSettings.status': 'finished'
        })
            .populate('clubId', 'name location')
            .populate('tournamentPlayers.playerReference', 'name')
            .sort({ 'tournamentSettings.startDate': -1 })
            .limit(limit);
    }

    static async getAllClubs(limit: number = 100): Promise<any[]> {
        await connectMongo();
        
        return await ClubModel.find()
            .populate('members', 'name email')
            .populate('moderators', 'name email')
            .sort({ name: 1 })
            .limit(limit);
    }

    static async getTopPlayers(limit: number = 10, skip: number = 0): Promise<{ players: any[], total: number }> {
        await connectMongo();
        
        // Get total count of all players
        const total = await PlayerModel.countDocuments();
        
        // Get ALL players to sort by MMR in memory (handle null/undefined MMR)
        const allPlayers = await PlayerModel.find()
        .populate('userRef', 'name email');
        
        // Sort by MMR descending in memory
        const sortedPlayers = allPlayers.sort((a, b) => {
            const aMMR = a.stats?.mmr ?? 800; // Default to base MMR if missing
            const bMMR = b.stats?.mmr ?? 800;
            // Sort DESCENDING by MMR (higher MMR first)
            if (bMMR !== aMMR) return bMMR - aMMR;
            // Then by name ascending
            return a.name.localeCompare(b.name);
        });
        
        // Apply pagination after sorting
        const players = sortedPlayers.slice(skip, skip + limit).map((player, index) => {
            const playerObj = player.toObject();
            const mmr = playerObj.stats?.mmr ?? 800;
            
            // Ensure stats object exists and has mmr
            if (!playerObj.stats) {
                playerObj.stats = {};
            }
            playerObj.stats.mmr = mmr;
            
            return {
                ...playerObj,
                mmr: mmr,
                mmrTier: this.getMMRTier(mmr),
                globalRank: skip + index + 1 // Calculate global rank based on pagination
            };
        });
        
        return { players, total };
    }

    static async getPopularClubs(limit: number = 5): Promise<any[]> {
        await connectMongo();
        
        return await ClubModel.aggregate([
            {
                $lookup: {
                    from: 'tournaments',
                    localField: '_id',
                    foreignField: 'clubId',
                    as: 'tournaments'
                }
            },
            {
                $addFields: {
                    tournamentCount: { $size: '$tournaments' },
                    memberCount: { $size: { $ifNull: ['$members', []] } }
                }
            },
            {
                $sort: { tournamentCount: -1 }
            },
            {
                $limit: limit
            },
            {
                $project: {
                    tournaments: 0 // Remove the tournaments array to keep response light
                }
            }
        ]);
    }

    private static async getGlobalPlayerRanking(): Promise<any[]> {
        await connectMongo();
        
        // Get ALL players and sort by MMR
        const allPlayers = await PlayerModel.find().select('_id stats.mmr');
        
        // Sort by MMR descending
        return allPlayers.sort((a, b) => {
            const aMMR = a.stats?.mmr ?? 800;
            const bMMR = b.stats?.mmr ?? 800;
            if (bMMR !== aMMR) return bMMR - aMMR;
            return a._id.toString().localeCompare(b._id.toString()); // Stable sort
        });
    }
} 