import mongoose, { Schema, Document } from 'mongoose';

export interface LeagueStandingDocument extends Document {
  leagueId: mongoose.Types.ObjectId;
  playerId: mongoose.Types.ObjectId;
  clubId: mongoose.Types.ObjectId;
  
  // Pontok és helyezés
  totalPoints: number;
  tournamentsPlayed: number;
  bestFinish: number; // Legjobb helyezés (1 = győztes, 2 = döntős, stb.)
  
  // Részletes pontok
  pointsBreakdown: {
    groupStage: number;
    knockoutStage: number;
    manual: number; // Manuálisan hozzáadott pontok
    existing: number; // Meglévő pontok
  };
  
  // Helyezések
  finishes: {
    first: number;   // 1. helyek száma
    second: number;  // 2. helyek száma
    third: number;   // 3. helyek száma
    top5: number;    // Top 5 helyek száma
    top10: number;   // Top 10 helyek száma
  };
  
  // Utolsó frissítés
  lastUpdated: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const leagueStandingSchema = new Schema<LeagueStandingDocument>({
  leagueId: {
    type: Schema.Types.ObjectId,
    ref: 'League',
    required: true
  },
  playerId: {
    type: Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  
  // Pontok és helyezés
  totalPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  tournamentsPlayed: {
    type: Number,
    default: 0,
    min: 0
  },
  bestFinish: {
    type: Number,
    default: 999, // Nagy szám, hogy a legjobb helyezés kisebb legyen
    min: 1
  },
  
  // Részletes pontok
  pointsBreakdown: {
    groupStage: {
      type: Number,
      default: 0,
      min: 0
    },
    knockoutStage: {
      type: Number,
      default: 0,
      min: 0
    },
    manual: {
      type: Number,
      default: 0,
      min: 0
    },
    existing: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Helyezések
  finishes: {
    first: {
      type: Number,
      default: 0,
      min: 0
    },
    second: {
      type: Number,
      default: 0,
      min: 0
    },
    third: {
      type: Number,
      default: 0,
      min: 0
    },
    top5: {
      type: Number,
      default: 0,
      min: 0
    },
    top10: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Utolsó frissítés
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexek - egy játékos csak egyszer szerepelhet egy ligában
leagueStandingSchema.index({ leagueId: 1, playerId: 1 }, { unique: true });
leagueStandingSchema.index({ leagueId: 1, totalPoints: -1 }); // Rendezéshez
leagueStandingSchema.index({ clubId: 1, leagueId: 1 });

export const LeagueStandingModel = mongoose.models.LeagueStanding || mongoose.model<LeagueStandingDocument>('LeagueStanding', leagueStandingSchema);
