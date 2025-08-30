import mongoose, { Schema, Document } from 'mongoose';

export interface LeagueDocument extends Document {
  name: string;
  description?: string;
  clubId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  
  // Pontozási rendszer
  scoringSystem: {
    groupStage: {
      eliminated: number; // Csoportkörben kiesők pontja
    };
    knockoutStage: {
      round1: number;     // 1. kör kiesők pontja
      round2: number;     // 2. kör kiesők pontja
      round3: number;     // 3. kör kiesők pontja
      quarterFinal: number; // Negyeddöntő kiesők pontja
      semiFinal: number;    // Elődöntő kiesők pontja
      finalist: number;     // Döntős pontja
      winner: number;       // Győztes pontja
    };
  };
  
  // Liga beállítások
  settings: {
    allowManualPoints: boolean; // Manuális pontok engedélyezése
    allowExistingPoints: boolean; // Meglévő pontok felvitele
    autoCalculateStandings: boolean; // Automatikus állás számítás
  };
  
  // Kapcsolódó versenyek
  tournaments: mongoose.Types.ObjectId[];
  
  createdAt: Date;
  updatedAt: Date;
}

const leagueSchema = new Schema<LeagueDocument>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  clubId: {
    type: Schema.Types.ObjectId,
    ref: 'Club',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Pontozási rendszer
  scoringSystem: {
    groupStage: {
      eliminated: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    knockoutStage: {
      round1: {
        type: Number,
        default: 1,
        min: 0
      },
      round2: {
        type: Number,
        default: 2,
        min: 0
      },
      round3: {
        type: Number,
        default: 3,
        min: 0
      },
      quarterFinal: {
        type: Number,
        default: 5,
        min: 0
      },
      semiFinal: {
        type: Number,
        default: 8,
        min: 0
      },
      finalist: {
        type: Number,
        default: 12,
        min: 0
      },
      winner: {
        type: Number,
        default: 20,
        min: 0
      }
    }
  },
  
  // Liga beállítások
  settings: {
    allowManualPoints: {
      type: Boolean,
      default: true
    },
    allowExistingPoints: {
      type: Boolean,
      default: true
    },
    autoCalculateStandings: {
      type: Boolean,
      default: true
    }
  },
  
  // Kapcsolódó versenyek
  tournaments: [{
    type: Schema.Types.ObjectId,
    ref: 'Tournament'
  }]
}, {
  timestamps: true
});

// Indexek
leagueSchema.index({ clubId: 1, isActive: 1 });
leagueSchema.index({ createdBy: 1 });
leagueSchema.index({ tournaments: 1 });

export const LeagueModel = mongoose.models.League || mongoose.model<LeagueDocument>('League', leagueSchema);
