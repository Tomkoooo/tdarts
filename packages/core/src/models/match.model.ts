import mongoose from 'mongoose';
import { MatchDocument } from '../interfaces/match.interface';

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
  winnerArrowCount: Number,
  loserRemainingScore: Number,
  doubleAttempts: Number,
  player1TotalDarts: Number,
  player2TotalDarts: Number,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const matchPlayerSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  legsWon: { type: Number, default: 0 },
  legsLost: { type: Number, default: 0 },
  average: { type: Number, default: 0 },
  firstNineAvg: { type: Number, default: 0 },
  highestCheckout: { type: Number, default: 0 },
  oneEightiesCount: { type: Number, default: 0 },
}, { _id: false });

const matchSchema = new mongoose.Schema<MatchDocument>({
  boardReference: { type: Number, required: true },
  tournamentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  type: { type: String, enum: ['group', 'knockout'], required: true },
  round: { type: Number, required: true },
  bracketPosition: Number,
  scorerSource: {
    type: { type: String, enum: ['group_loser', 'match_loser', 'manual'] },
    sourceMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }
  },
  player1: { type: matchPlayerSchema, required: false },
  player2: { type: matchPlayerSchema, required: false },
  scorer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: false },
  legsToWin: { type: Number },
  startingPlayer: { type: Number },
  status: { type: String, enum: ['pending', 'ongoing', 'finished'], default: 'pending' },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  legs: [legSchema],
  manualOverride: { type: Boolean, default: false },
  overrideTimestamp: { type: Date },
  manualChangeType: { type: String, enum: ['admin_finish', 'admin_state_change', 'winner_override', null], default: null },
  manualChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  previousState: {
    player1LegsWon: { type: Number },
    player2LegsWon: { type: Number },
    winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    status: { type: String }
  }
}, { timestamps: true });

matchSchema.pre('save', function (this: MatchDocument, next) {
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
    if (!this.player1 && this.player2) {
      this.winnerId = this.player2.playerId as any;
      this.status = 'finished';
    } else if (this.player1 && !this.player2) {
      this.winnerId = this.player1.playerId as any;
      this.status = 'finished';
    } else if (this.player1 && this.player2 &&
               (this.player1.playerId === null || this.player1.playerId === undefined ||
                this.player2.playerId === null || this.player2.playerId === undefined)) {
      if (this.player1.playerId && !this.player2.playerId) {
        this.winnerId = this.player1.playerId as any;
        this.status = 'finished';
      } else if (!this.player1.playerId && this.player2.playerId) {
        this.winnerId = this.player2.playerId as any;
        this.status = 'finished';
      } else {
        this.winnerId = undefined;
        this.status = 'pending';
      }
    } else if (this.player1 && this.player2 &&
               this.player1.playerId && this.player2.playerId) {
      this.winnerId = undefined;
      this.status = 'pending';
    } else {
      this.winnerId = undefined;
      this.status = 'pending';
    }
  }
  next();
});

matchSchema.index({ tournamentRef: 1, manualOverride: 1 });
matchSchema.index({ manualChangeType: 1 });
matchSchema.index({ manualChangedBy: 1 });
matchSchema.index({ tournamentRef: 1, status: 1 });
matchSchema.index({ tournamentRef: 1, status: 1, updatedAt: -1 });
matchSchema.index({ tournamentRef: 1, status: 1, createdAt: 1 });
matchSchema.index({ tournamentRef: 1, boardReference: 1, status: 1, createdAt: 1 });
matchSchema.index({ tournamentRef: 1, status: 1, 'player1.playerId': 1, createdAt: -1 });
matchSchema.index({ tournamentRef: 1, status: 1, 'player2.playerId': 1, createdAt: -1 });
matchSchema.index({ tournamentRef: 1, 'player1.playerId': 1, createdAt: -1 });
matchSchema.index({ tournamentRef: 1, 'player2.playerId': 1, createdAt: -1 });
matchSchema.index({ status: 1, 'player1.playerId': 1, createdAt: -1 });
matchSchema.index({ status: 1, 'player2.playerId': 1, createdAt: -1 });
matchSchema.index({ 'player1.playerId': 1, 'player2.playerId': 1, status: 1, createdAt: -1 });
matchSchema.index({ 'player2.playerId': 1, 'player1.playerId': 1, status: 1, createdAt: -1 });
matchSchema.index({ manualOverride: 1, overrideTimestamp: -1 });

export const MatchModel = mongoose.models.Match || mongoose.model<MatchDocument>('Match', matchSchema);
