import mongoose, { Types } from 'mongoose';
import { MatchDocument } from '@/interface/match.interface';

const throwSchema = new mongoose.Schema({
  score: { type: Number, required: true },
  darts: { type: Number, required: true },
  isDouble: { type: Boolean, default: false },
  isCheckout: { type: Boolean, default: false },
}, { _id: false });

const legSchema = new mongoose.Schema({
  player1Score: { type: Number, required: true },
  player2Score: { type: Number, required: true },
  player1Throws: [throwSchema],
  player2Throws: [throwSchema],
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  checkoutScore: Number,
  checkoutDarts: Number,
  doubleAttempts: Number,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const matchPlayerSchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  legsWon: { type: Number, default: 0 },
  legsLost: { type: Number, default: 0 },
  average: { type: Number, default: 0 },
}, { _id: false });

const matchSchema = new mongoose.Schema<MatchDocument>({
  boardReference: { type: Number, required: true },
  tournamentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  type: { type: String, enum: ['group', 'knockout'], required: true },
  round: { type: Number, required: true },
  player1: { type: matchPlayerSchema, required: true },
  player2: { type: matchPlayerSchema, required: true },
  scorer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  legsToWin: { type: Number},
  startingPlayer: { type: Number},
  status: { type: String, enum: ['pending', 'ongoing', 'finished'], default: 'pending' },
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  legs: [legSchema],
}, { timestamps: true });

// Automatikus winnerId számítás mentés előtt
matchSchema.pre('save', function (next) {
  if (this.player1.legsWon > this.player2.legsWon) {
    this.winnerId = this.player1.playerId;
  } else if (this.player2.legsWon > this.player1.legsWon) {
    this.winnerId = this.player2.playerId;
  } else {
    this.winnerId = undefined;
  }
  next();
});

export const MatchModel = mongoose.models.Match || mongoose.model<MatchDocument>('Match', matchSchema); 