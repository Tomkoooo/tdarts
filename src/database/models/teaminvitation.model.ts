import mongoose, { Schema } from 'mongoose';
import { ITeamInvitation } from '@/database/interfaces/teaminvitation.interface';

const TeamInvitationSchema = new Schema<ITeamInvitation>({
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  inviterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  inviteeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'declined'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

// Index for quick lookup by token
TeamInvitationSchema.index({ token: 1 });
// TTL index to automatically remove expired invitations
TeamInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TeamInvitationModel = mongoose.models.TeamInvitation || 
  mongoose.model<ITeamInvitation>('TeamInvitation', TeamInvitationSchema);
