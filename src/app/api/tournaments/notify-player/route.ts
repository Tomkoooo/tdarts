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

    const { playerId, subject, message, tournamentName, language = 'hu' } = await request.json();

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

    // Generate email content based on language preference
    const isHungarian = language === 'hu';
    
    const emailContent = `
      <div class="email-content" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #b62441 0%, #8a1b31 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">
            ${isHungarian ? 'tDarts - Verseny Értesítés' : 'tDarts - Tournament Notification'}
          </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
          ${isHungarian ? `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Kedves ${player.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              A ${tournamentName} verseny kapcsán szeretnénk értesíteni Önt a következőről:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${makeUrlsClickable(message)}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              Ha bármilyen kérdése van, kérjük, lépjen kapcsolatba velünk.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Üdvözlettel,<br>
              A tDarts csapat
            </p>
          ` : `
            <h2 style="color: #b62441; font-size: 20px; margin-bottom: 16px;">Dear ${player.name}!</h2>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              Regarding the ${tournamentName} tournament, we would like to inform you about the following:
            </p>
            <div style="background: #f9fafb; border-left: 4px solid #b62441; padding: 16px; margin: 20px 0;">
              <h3 style="color: #b62441; margin: 0 0 8px 0; font-size: 16px;">${subject}</h3>
              <p style="color: #374151; margin: 0; white-space: pre-line;">${makeUrlsClickable(message)}</p>
            </div>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
              If you have any questions, please contact us.
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Best regards,<br>
              The tDarts team
            </p>
          `}
        </div>
        
        <!-- Footer -->
        <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            © 2024 tDarts. Minden jog fenntartva.
          </p>
        </div>
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
