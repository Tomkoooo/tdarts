import mongoose from 'mongoose';

const pendingTournamentSchema = new mongoose.Schema(
  {
    stripeSessionId: { type: String, required: true, unique: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // Auto-delete after 1 hour
  },
  { collection: 'pending_tournaments' }
);

export const PendingTournamentModel =
  mongoose.models.PendingTournament || mongoose.model('PendingTournament', pendingTournamentSchema);
