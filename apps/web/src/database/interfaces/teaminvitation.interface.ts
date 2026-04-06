import { Document, Types } from 'mongoose';

export interface ITeamInvitation extends Document {
  tournamentId: Types.ObjectId;
  teamId: Types.ObjectId;
  inviterId: Types.ObjectId;
  inviteeId: Types.ObjectId; // The user being invited
  inviteeEmail?: string; // Optional fallback for account creation flow
  token: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
  expiresAt: Date;
}
