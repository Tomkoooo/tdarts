import mongoose from 'mongoose';
import { LeagueDocument, DEFAULT_LEAGUE_POINTS_CONFIG } from '@/interface/league.interface';
import { POINT_SYSTEM_IDS } from '@/lib/leaguePointSystems';

// Points Configuration Schema
const pointsConfigSchema = new mongoose.Schema({
  groupDropoutPoints: { type: Number, required: true, default: DEFAULT_LEAGUE_POINTS_CONFIG.groupDropoutPoints },
  knockoutBasePoints: { type: Number, required: true, default: DEFAULT_LEAGUE_POINTS_CONFIG.knockoutBasePoints },
  knockoutMultiplier: { type: Number, required: true, default: DEFAULT_LEAGUE_POINTS_CONFIG.knockoutMultiplier },
  winnerBonus: { type: Number, required: true, default: DEFAULT_LEAGUE_POINTS_CONFIG.winnerBonus },
  maxKnockoutRounds: { type: Number, required: true, default: DEFAULT_LEAGUE_POINTS_CONFIG.maxKnockoutRounds },
  fixedRankPoints: { type: Map, of: Number, required: false },
  useFixedRanks: { type: Boolean, required: true, default: DEFAULT_LEAGUE_POINTS_CONFIG.useFixedRanks },
}, { _id: false });

// Manual Adjustment Schema
const manualAdjustmentSchema = new mongoose.Schema({
  points: { type: Number, required: true },
  reason: { type: String, required: true },
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  adjustedAt: { type: Date, default: Date.now },
}, { _id: false });

// Tournament Points Schema
const tournamentPointsSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  points: { type: Number, required: true },
  position: { type: Number, required: true },
  eliminatedIn: { type: String, required: true }, // 'group' | 'round-1' | 'round-2' | etc.
}, { _id: false });

// League Player Schema
const leaguePlayerSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  totalPoints: { type: Number, required: true, default: 0 },
  tournamentPoints: [tournamentPointsSchema],
  manualAdjustments: [manualAdjustmentSchema],
}, { _id: false });

// Removed Player Schema
const removedPlayerSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  totalPoints: { type: Number, required: true },
  tournamentPoints: [tournamentPointsSchema],
  manualAdjustments: [manualAdjustmentSchema],
  reason: { type: String, required: true },
  removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  removedAt: { type: Date, default: Date.now },
}, { _id: false });

// Main League Schema
const leagueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
  attachedTournaments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }],
  players: [leaguePlayerSchema],
  removedPlayers: [removedPlayerSchema],
  pointsConfig: { type: pointsConfigSchema, required: true, default: DEFAULT_LEAGUE_POINTS_CONFIG },
  pointSystemType: { type: String, enum: [...POINT_SYSTEM_IDS, 'gold_fisch'], required: true, default: 'platform' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  verified: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
}, { 
  collection: 'leagues', 
  timestamps: true 
});

// Indexes for performance
leagueSchema.index({ club: 1, isActive: 1 });
leagueSchema.index({ 'attachedTournaments': 1 });
leagueSchema.index({ 'players.player': 1 });
leagueSchema.index({ createdBy: 1 });

// Validation middleware
leagueSchema.pre('save', function(this: any, next) {
  // Validate that endDate is after startDate if both are provided
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Validate points configuration
  if (this.pointsConfig.knockoutMultiplier <= 1) {
    return next(new Error('Knockout multiplier must be greater than 1'));
  }
  
  if (this.pointsConfig.maxKnockoutRounds < 1) {
    return next(new Error('Max knockout rounds must be at least 1'));
  }
  
  next();
});

// Instance methods
leagueSchema.methods.calculatePlayerTotalPoints = function(this: any, playerId: string): number {
  const player = this.players.find((p: any) => p.player.toString() === playerId);
  if (!player) return 0;
  
  const tournamentPoints = player.tournamentPoints.reduce((sum: number, tp: any) => sum + tp.points, 0);
  const adjustmentPoints = player.manualAdjustments.reduce((sum: number, adj: any) => sum + adj.points, 0);
  
  return tournamentPoints + adjustmentPoints;
};

leagueSchema.methods.getLeaderboard = function(this: any) {
  return this.players
    .map((player: any) => ({
      ...player.toObject(),
      totalPoints: this.calculatePlayerTotalPoints(player.player.toString())
    }))
    .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
    .map((player: any, index: number) => ({
      position: index + 1,
      ...player
    }));
};

// Static methods
leagueSchema.statics.findByClub = function(clubId: string, activeOnly: boolean = true) {
  const query: any = { club: clubId };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query).populate('attachedTournaments').populate('players.player');
};

leagueSchema.statics.findByTournament = function(tournamentId: string) {
  return this.findOne({ attachedTournaments: tournamentId }).populate('club').populate('players.player');
};

// Transform function for JSON output
leagueSchema.set('toJSON', {
  transform: function(doc, ret: any) {
    ret._id = ret._id.toString();
    if (ret.club && ret.club._id) {
      ret.club = ret.club._id.toString();
    }
    if (ret.attachedTournaments) {
      ret.attachedTournaments = ret.attachedTournaments.map((t: any) => 
        typeof t === 'object' && t._id ? t._id.toString() : t.toString()
      );
    }
    if (ret.players) {
      ret.players = ret.players.map((player: any) => ({
        ...player,
        player: typeof player.player === 'object' && player.player._id 
          ? player.player._id.toString() 
          : player.player.toString(),
        tournamentPoints: player.tournamentPoints?.map((tp: any) => ({
          ...tp,
          tournament: typeof tp.tournament === 'object' && tp.tournament._id 
            ? tp.tournament._id.toString() 
            : tp.tournament.toString()
        })) || [],
        manualAdjustments: player.manualAdjustments?.map((adj: any) => ({
          ...adj,
          adjustedBy: typeof adj.adjustedBy === 'object' && adj.adjustedBy._id 
            ? adj.adjustedBy._id.toString() 
            : adj.adjustedBy.toString()
        })) || []
      }));
    }
    if (ret.removedPlayers) {
      ret.removedPlayers = ret.removedPlayers.map((removal: any) => ({
        ...removal,
        player: typeof removal.player === 'object' && removal.player._id 
          ? removal.player._id.toString() 
          : removal.player.toString(),
        tournamentPoints: removal.tournamentPoints?.map((tp: any) => ({
          ...tp,
          tournament: typeof tp.tournament === 'object' && tp.tournament._id 
            ? tp.tournament._id.toString() 
            : tp.tournament.toString()
        })) || [],
        manualAdjustments: removal.manualAdjustments?.map((adj: any) => ({
          ...adj,
          adjustedBy: typeof adj.adjustedBy === 'object' && adj.adjustedBy._id 
            ? adj.adjustedBy._id.toString() 
            : adj.adjustedBy.toString()
        })) || [],
        removedBy: typeof removal.removedBy === 'object' && removal.removedBy._id 
          ? removal.removedBy._id.toString() 
          : removal.removedBy.toString()
      }));
    }
    return ret;
  }
});

export const LeagueModel = mongoose.models.League || mongoose.model<LeagueDocument>('League', leagueSchema);
