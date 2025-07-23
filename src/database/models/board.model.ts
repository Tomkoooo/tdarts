import { BoardDocument } from '@/interface/board.interface';
import { GenerateRandomHash } from '@/lib/utils';
import mongoose from 'mongoose';

export const BoardSchema = new mongoose.Schema<BoardDocument>({
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clubs', required: true },
  boardId: { type: String, required: true, default: GenerateRandomHash(16) },
  currentMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  boardNumber: { type: Number },
  status: { type: String, enum: ['idle', 'waiting', 'playing'], default: 'idle' },
  waitingPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'boards' });

// Indexek
BoardSchema.index({ tournamentId: 1, boardId: 1 }, { unique: true });

// Middleware az updatedAt frissítéséhez
BoardSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const BoardModel = mongoose.models.Board || mongoose.model<BoardDocument>('Board', BoardSchema);