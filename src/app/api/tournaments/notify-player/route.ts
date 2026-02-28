import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { ClubService } from '@/database/services/club.service';
import { sendEmail } from '@/lib/mailer';
import { connectMongo } from '@/lib/mongoose';
import { PlayerModel } from '@/database/models/player.model';
import { TournamentModel } from '@/database/models/tournament.model';
import { EmailTemplateService } from '@/database/services/emailtemplate.service';
import { normalizeEmailLocale, renderMinimalEmailLayout, textToEmailHtml } from '@/lib/email-layout';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: NextRequest) {
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

    const resolvedLocale = normalizeEmailLocale(
      (player.userRef as any).locale || language || request.headers.get('accept-language')
    );
    const template = await EmailTemplateService.getRenderedTemplate(
      'player_tournament_notification',
      {
        tournamentName,
        playerName: player.name,
        customSubject: subject,
        customMessage: message,
        language: resolvedLocale,
      },
      {
        locale: resolvedLocale,
      }
    );
    const fallbackText =
      resolvedLocale === 'en'
        ? `Dear ${player.name}!\n\nRegarding ${tournamentName}:\n${subject}\n${message}\n\nBest regards,\ntDarts Team`
        : `Kedves ${player.name}!\n\nA ${tournamentName} verseny kapcsán:\n${subject}\n${message}\n\nÜdvözlettel,\ntDarts csapat`;

    await sendEmail({
      to: [playerEmail],
      subject: template?.subject || `[${tournamentName}] ${subject}`,
      text: template?.text || fallbackText,
      html:
        template?.html ||
        renderMinimalEmailLayout({
          locale: resolvedLocale,
          title: `[${tournamentName}] ${subject}`,
          heading: subject,
          bodyHtml: textToEmailHtml(fallbackText),
        }),
      resendContext: {
        templateKey: 'player_tournament_notification',
        variables: {
          tournamentName,
          playerName: player.name,
          customSubject: subject,
          customMessage: message,
          language: resolvedLocale,
        },
        locale: resolvedLocale,
      },
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

export const POST = withApiTelemetry('/api/tournaments/notify-player', __POST as any);
