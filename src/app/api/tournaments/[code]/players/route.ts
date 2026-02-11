import { NextRequest, NextResponse } from "next/server";
import { TournamentService } from "@/database/services/tournament.service";
import { PlayerService } from "@/database/services/player.service";
import { PlayerModel } from "@/database/models/player.model";

import { TournamentModel } from "@/database/models/tournament.model";
import { AuthService } from "@/database/services/auth.service";
import { TeamInvitationService } from '@/database/services/teaminvitation.service';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { sendEmail } from '@/lib/mailer';
import { UserModel } from '@/database/models/user.model';


export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const player = await PlayerService.findPlayerByUserId(userId);
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  return NextResponse.json(player._id);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId, userRef, name, members } = await request.json(); // Added members, type
  
  let player;
  // console.log('Adding player:', { playerId, userRef, name, members, type });

  const tournament = await TournamentModel.findOne({ tournamentId: code }).select('tournamentSettings');
  const mode = tournament?.tournamentSettings?.participationMode || 'individual';

  if (mode === 'pair' || mode === 'team') {
      if (!members || !Array.isArray(members) || members.length < 1) {
           return NextResponse.json({ error: `${mode} requires at least 1 partner` }, { status: 400 });
      }
      
      // Decode JWT to get current user (always needed for logic)
      const user = await AuthService.verifyToken(token);
      const currentUserId = user._id;

      // Create members list and determine registration type
      const memberIds = [];
      let isSelfRegistration = false;

      // Auto-add current user if only 1 member provided (Self-Registration)
      if (members.length === 1) {
          isSelfRegistration = true;
          
          // Get user info for current user
          console.log('Current user ID:', currentUserId);
          const currentUser = await UserModel.findById(currentUserId);
          if (!currentUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
          }
          
          // Create player for current user (first member)
          const currentUserPlayer = await PlayerService.findOrCreatePlayerByUserRef(
            currentUserId.toString(),
            currentUser.name
          );
          
          memberIds.push(currentUserPlayer._id);
      }
      
      // Process other members
      for (const m of members) {
          let mPlayer;
          if (m.playerId || m._id) {
             mPlayer = await PlayerModel.findById(m.playerId || m._id);
          } else if (m.userRef && m.name) {
             mPlayer = await PlayerService.findOrCreatePlayerByUserRef(m.userRef, m.name);
          } else if (m.name) {
             mPlayer = await PlayerService.findOrCreatePlayerByName(m.name);
          } else {
              throw new Error('Invalid member data');
          }

          if (!mPlayer) throw new Error("Could not find/create member");
          
          // Check if this member is the current user (e.g. Admin adding themselves via Moderator form)
          if (mPlayer.userRef === currentUserId || mPlayer.userRef === currentUserId.toString()) {
              isSelfRegistration = true;
          }
          
          memberIds.push(mPlayer._id);
      }
      
      // If team name is not provided, generate one
      const teamName = name || 'Team ' + new Date().getTime(); 

      // Create Team Player (virtual)
      // Assume pair for now if 2 members
      // PlayerService.findOrCreateTeam only accepts 2.
      // For now restrict to 2 for pair.
      player = await PlayerService.findOrCreateTeam(teamName, memberIds[0].toString(), memberIds[1].toString());

      // Check if we need to send invitation (Self Registration AND partner is registered)
      // We need to fetch clubId to check moderator status (redundant for self-reg check but kept for potential future use)
      const tournamentData = await TournamentModel.findOne({ tournamentId: code }).select('clubId tournamentSettings');
      
      // Define partner (the one who is NOT current user)
      let partnerUserId = null;
      if (members.length === 1) {
          partnerUserId = members[0].userRef;
      } else {
          // Find the member from input that is NOT the current user
          const partner = members.find((m: any) => m.userRef !== currentUserId && m.userRef !== currentUserId.toString());
          if (partner) partnerUserId = partner.userRef;
      }
      
      if (isSelfRegistration && partnerUserId) {
          const user = await AuthService.verifyToken(token);
          const currentUserId = user._id;
          const currentUser = await UserModel.findById(currentUserId);
          
          // Invitation Flow
          // Create invitation
          const invitation = await TeamInvitationService.createInvitation(
              tournamentData._id.toString(),
              player._id.toString(),
              currentUserId.toString(),
              partnerUserId
          );

          // Send email
          const partnerUser = await UserModel.findById(partnerUserId);
          if (partnerUser && partnerUser.email) {
              const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}`;
              const declineUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invitations/${invitation.token}?action=decline`;
              
              const template = await EmailTemplateService.getRenderedTemplate('team_invitation', {
                  inviterName: currentUser.name,
                  inviteeName: partnerUser.name,
                  teamName: teamName,
                  tournamentName: tournamentData.tournamentSettings.name,
                  tournamentUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/tournaments/${code}`,
                  acceptUrl,
                  declineUrl,
                  currentYear: new Date().getFullYear()
              });

              if (template) {
                  await sendEmail({
                      to: [partnerUser.email],
                      subject: template.subject, // Use template subject
                      text: template.text,
                      html: template.html
                  });
              }
          }

          // Add to Waiting List instead of Main List
          // For now, I'll update the tournament directly here to push to waitingList
          await TournamentModel.findOneAndUpdate(
              { tournamentId: code },
              {
                  $push: {
                      waitingList: {
                          playerReference: player._id,
                          addedAt: new Date(),
                          note: "Várakozás a társ visszaigazolására"
                      }
                  }
              }
          );
          
          return NextResponse.json({ 
              success: true, 
              playerId: player._id,
              message: "waiting_for_partner",
              note: "Invitation sent to partner" 
          });
      }

  } else {
      // Individual
      // If playerId is provided, use existing player (only for guest players)
      if (playerId) {
          player = await PlayerModel.findById(playerId);
          if (!player) {
          throw new Error('Player not found');
          }
      } else {
          // Create new player
          if (userRef && name) {
          player = await PlayerService.findOrCreatePlayerByUserRef(userRef, name);
          } else if (name) {
          player = await PlayerService.findOrCreatePlayerByName(name);
          } else {
          throw new Error('Missing required data: name or userRef');
          }
      }
  }
  
  const success = await TournamentService.addTournamentPlayer(code, player._id);
  return NextResponse.json({ success, playerId: player._id});
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerId, status } = await request.json();
  const success = await TournamentService.updateTournamentPlayerStatus(code, playerId, status);
  return NextResponse.json({ success });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  
  // Get user from JWT token
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

    
  const { playerId } = await request.json();
  const success = await TournamentService.removeTournamentPlayer(code, playerId);
  return NextResponse.json({ success });
}