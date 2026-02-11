import { TeamInvitationModel } from '@/database/models/teaminvitation.model';
import { ITeamInvitation } from '@/database/interfaces/teaminvitation.interface';
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';

export class TeamInvitationService {
  /**
   * Create a new team invitation
   */
  static async createInvitation(
    tournamentId: string,
    teamId: string,
    inviterId: string,
    inviteeId: string
  ): Promise<ITeamInvitation> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2); // Expires in 2 days

    return await TeamInvitationModel.create({
      tournamentId: new Types.ObjectId(tournamentId),
      teamId: new Types.ObjectId(teamId),
      inviterId: new Types.ObjectId(inviterId),
      inviteeId: new Types.ObjectId(inviteeId),
      token: uuidv4(),
      status: 'pending',
      expiresAt
    });
  }

  /**
   * Get invitation by token
   */
  static async getInvitationByToken(token: string): Promise<ITeamInvitation | null> {
    return await TeamInvitationModel.findOne({ 
      token,
      expiresAt: { $gt: new Date() }, // Not expired
      status: 'pending' // Only pending invitations
    })
    .populate('tournamentId')
    .populate({
      path: 'teamId',
      populate: { path: 'members' } // Populate team members to show names
    })
    .populate('inviterId', 'name email')
    .populate('inviteeId', 'name email');
  }

  /**
   * Accept invitation
   */
  static async acceptInvitation(token: string): Promise<ITeamInvitation | null> {
    return await TeamInvitationModel.findOneAndUpdate(
      { token, status: 'pending' },
      { status: 'accepted' },
      { new: true }
    );
  }

  /**
   * Decline invitation
   */
  static async declineInvitation(token: string): Promise<ITeamInvitation | null> {
    return await TeamInvitationModel.findOneAndUpdate(
      { token, status: 'pending' },
      { status: 'declined' },
      { new: true }
    );
  }

  /**
   * Check if specific invitation exists and is pending
   */
  static async hasPendingInvitation(teamId: string, inviteeId: string): Promise<boolean> {
    const invitation = await TeamInvitationModel.findOne({
      teamId: new Types.ObjectId(teamId),
      inviteeId: new Types.ObjectId(inviteeId),
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });
    return !!invitation;
  }
}
