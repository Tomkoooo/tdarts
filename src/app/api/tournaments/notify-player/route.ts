import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { ClubService } from '@/database/services/club.service';
import { sendEmail } from '@/lib/mailer';
import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';
import { TournamentModel } from '@/database/models/tournament.model';

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId, subject, message, tournamentName } = await request.json();

    if (!playerId || !subject || !message || !tournamentName) {
      return NextResponse.json({ 
        error: 'Missing required fields: playerId, subject, message, tournamentName' 
      }, { status: 400 });
    }

    // Find the tournament that contains this player
    const tournament = await TournamentModel.findOne({
      'tournamentPlayers.playerReference': playerId
    }).populate('clubId');

    if (!tournament) {
      return NextResponse.json({ error: 'Tournament not found for this player' }, { status: 404 });
    }

    // Check if user has permission to notify players
    const userRole = await ClubService.getUserRoleInClub(user._id.toString(), tournament.clubId._id.toString());
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get player information
    const player = await PlayerModel.findById(playerId).populate('userRef');
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Get player's email if they have a user account
    if (!player.userRef || !player.userRef.email) {
      return NextResponse.json({ 
        error: 'Player does not have a registered email address' 
      }, { status: 400 });
    }

    const playerEmail = player.userRef.email;

    // Function to make URLs clickable
    const makeUrlsClickable = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      return text.replace(urlRegex, (url) => {
        const href = url.startsWith('http') ? url : `https://${url}`;
        return `<a href="${href}" target="_blank" style="color: #b62441; text-decoration: underline;">${url}</a>`;
      });
    };

    // Send email notification
    const emailContent = `
      <div class="email-content" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p style="color: #6b7280; font-size: 12px; margin-bottom: 20px; font-style: italic;">For English scroll down</p>
        
        <h2 style="color: #b62441;">Értesítés a(z) ${tournamentName} tornáról</h2>
        <p>Kedves ${player.name}!</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">${subject}</h3>
          <p style="white-space: pre-wrap; margin-bottom: 0;">${makeUrlsClickable(message)}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          Ez az üzenet a(z) ${tournamentName} torna szervezőjétől érkezett.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <h2 style="color: #b62441; font-size: 1.1em; margin-top: 0.5em;">Notification about the ${tournamentName} tournament</h2>
        <p>Dear ${player.name},</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">${subject}</h3>
          <p style="white-space: pre-wrap; margin-bottom: 0;">${makeUrlsClickable(message)}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">
          This message was sent by the organizer of the ${tournamentName} tournament.
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          tDarts Platform - Versenykezelés<br>
          <span style="color: #bdbdbd; font-size: 11px;">tDarts Platform - Tournament Management</span>
        </p>
      </div>
    `;

    await sendEmail({
      to: [playerEmail],
      subject: `[${tournamentName}] ${subject}`,
      text: "",
      html: emailContent,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Notification sent successfully' 
    });

  } catch (error: any) {
    console.error('Notify player error:', error);
    return NextResponse.json({ 
      error: 'Failed to send notification',
      details: error.message 
    }, { status: 500 });
  }
}
