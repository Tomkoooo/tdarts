import mongoose from 'mongoose';
import { MatchDocument } from '@/interface/match.interface';

const throwSchema = new mongoose.Schema({
  score: { type: Number, required: true },
  darts: { type: Number, required: true },
  isDouble: { type: Boolean, default: false },
  isCheckout: { type: Boolean, default: false },
}, { _id: false });

const legSchema = new mongoose.Schema({
  legNumber: { type: Number, required: true },
  player1Score: { type: Number, required: true },
  player2Score: { type: Number, required: true },
  player1Throws: [throwSchema],
  player2Throws: [throwSchema],
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  checkoutScore: Number,
  checkoutDarts: Number,
  winnerArrowCount: Number, // Hány nyílból szállt ki a győztes
  loserRemainingScore: Number, // A vesztes játékos maradék pontjai
  doubleAttempts: Number,
  player1TotalDarts: Number, // Total darts thrown by player 1 (accounts for checkout)
  player2TotalDarts: Number, // Total darts thrown by player 2 (accounts for checkout)
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const matchPlayerSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  legsWon: { type: Number, default: 0 },
  legsLost: { type: Number, default: 0 },
  average: { type: Number, default: 0 },
  highestCheckout: { type: Number, default: 0 },
  oneEightiesCount: { type: Number, default: 0 },
}, { _id: false });

const matchSchema = new mongoose.Schema<MatchDocument>({
  boardReference: { type: Number, required: true },
  tournamentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  type: { type: String, enum: ['group', 'knockout'], required: true },
  round: { type: Number, required: true },
  bracketPosition: Number, // Position within the round for proper bracket display (0-indexed)
  scorerSource: { // Dynamic scorer assignment for knockout
    type: { type: String, enum: ['group_loser', 'match_loser', 'manual'] },
    sourceMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' }, // Which match's loser
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' } // Assigned player
  },
  player1: { type: matchPlayerSchema, required: false },
  player2: { type: matchPlayerSchema, required: false },
  scorer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: false },
  legsToWin: { type: Number},
  startingPlayer: { type: Number},
  status: { type: String, enum: ['pending', 'ongoing', 'finished'], default: 'pending' },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  legs: [legSchema],
}, { timestamps: true });

// Automatikus winnerId számítás mentés előtt
matchSchema.pre('save', function (this: MatchDocument, next) {
  // Only calculate winner if both players exist and have legs data
  if (this.player1 && this.player2 && 
      typeof this.player1.legsWon === 'number' && 
      typeof this.player2.legsWon === 'number') {
    if (this.player1.legsWon > this.player2.legsWon) {
      this.winnerId = this.player1.playerId as any;
    } else if (this.player2.legsWon > this.player1.legsWon) {
      this.winnerId = this.player2.playerId as any;
    } else {
      this.winnerId = undefined;
    }
  } else {
    // Handle bye matches (only one player exists)
    if (!this.player1 && this.player2) {
      // Only player2 exists - player2 wins
      this.winnerId = this.player2.playerId as any;
      this.status = 'finished';
    } else if (this.player1 && !this.player2) {
      // Only player1 exists - player1 wins
      this.winnerId = this.player1.playerId as any;
      this.status = 'finished';
    } else if (this.player1 && this.player2 && 
               (this.player1.playerId === null || this.player1.playerId === undefined || 
                this.player2.playerId === null || this.player2.playerId === undefined)) {
      // One of the players has null/undefined playerId (bye match)
      if (this.player1.playerId && !this.player2.playerId) {
        // Only player1 has valid playerId - player1 wins
        this.winnerId = this.player1.playerId as any;
        this.status = 'finished';
      } else if (!this.player1.playerId && this.player2.playerId) {
        // Only player2 has valid playerId - player2 wins
        this.winnerId = this.player2.playerId as any;
        this.status = 'finished';
      } else {
        // Both players have null/undefined playerId or both have valid playerId
        this.winnerId = undefined;
        this.status = 'pending';
      }
    } else if (this.player1 && this.player2 && 
               this.player1.playerId && this.player2.playerId) {
      // Both players exist and have valid playerIds - this is a regular match
      // Don't set winner automatically, let it be determined by legs
      this.winnerId = undefined;
      this.status = 'pending';
    } else {
      // If either player is missing, no winner can be determined
      this.winnerId = undefined;
      this.status = 'pending';
    }
  }
  next();
});

export const MatchModel = mongoose.models.Match || mongoose.model<MatchDocument>('Match', matchSchema); 