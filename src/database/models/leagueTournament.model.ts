import mongoose, { Schema, Document } from 'mongoose';

export interface LeagueTournamentDocument extends Document {
  leagueId: mongoose.Types.ObjectId;
  tournamentId: mongoose.Types.ObjectId;
  clubId: mongoose.Types.ObjectId;
  
  // Verseny állapota a ligában
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  
  // Pontok kiosztva-e
  pointsDistributed: boolean;
  pointsDistributedAt?: Date;
  
  // Verseny eredmények
  results: {
    playerId: mongoose.Types.ObjectId;
    finish: number; // Helyezés (1 = győztes, 2 = döntős, stb.)
    points: number; // Kapott pontok
    stage: 'group' | 'knockout' | 'final'; // Melyik szakaszban esett ki
    knockoutRound?: number; // Ha knockout, melyik kör
  }[];
  
  // Meta információk
  notes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const leagueTournamentSchema = new Schema<LeagueTournamentDocument>({
  leagueId: {
    type: Schema.Types.ObjectId,
    ref: 'League',
    required: true
  },
  tournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  
  // Verseny állapota a ligában
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Pontok kiosztva-e
  pointsDistributed: {
    type: Boolean,
    default: false
  },
  pointsDistributedAt: {
    type: Date
  },
  
  // Verseny eredmények
  results: [{
    playerId: {
      type: Schema.Types.ObjectId,
      ref: 'Player',
      required: true
    },
    finish: {
      type: Number,
      required: true,
      min: 1
    },
    points: {
      type: Number,
      required: true,
      min: 0
    },
    stage: {
      type: String,
      enum: ['group', 'knockout', 'final'],
      required: true
    },
    knockoutRound: {
      type: Number,
      min: 1
    }
  }],
  
  // Meta információk
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Indexek
leagueTournamentSchema.index({ leagueId: 1, tournamentId: 1 }, { unique: true });
leagueTournamentSchema.index({ leagueId: 1, status: 1 });
leagueTournamentSchema.index({ clubId: 1, leagueId: 1 });
leagueTournamentSchema.index({ pointsDistributed: 1 });

export const LeagueTournamentModel = mongoose.models.LeagueTournament || mongoose.model<LeagueTournamentDocument>('LeagueTournament', leagueTournamentSchema);
