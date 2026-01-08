import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { TournamentModel } from '@/database/models/tournament.model';
import { PendingTournamentModel } from '@/database/models/pendingTournament.model';
import { TournamentService } from '@/database/services/tournament.service';
import { SzamlazzService } from '@/lib/szamlazz';
import { LeagueService } from '@/database/services/league.service';
import { connectMongo } from '@/lib/mongoose';

const stripe = new Stripe(process.env.OAC_STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    await connectMongo();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      // 1. Check if tournament already created for this session
      let tournament = await TournamentModel.findOne({ stripeSessionId: sessionId });
      
      if (!tournament) {
        // 2. Fetch pending tournament data
        const pending = await PendingTournamentModel.findOne({ stripeSessionId: sessionId });
        if (!pending) {
          console.error('Pending tournament not found for session:', sessionId);
          return NextResponse.json({ error: 'Pending tournament not found' }, { status: 404 });
        }

        // 3. Create actual tournament
        const tournamentPayload = {
          ...pending.payload,
          paymentStatus: 'paid',
          isActive: true,
          stripeSessionId: sessionId
        };

        tournament = await TournamentService.createTournament(tournamentPayload);
        console.log('Final tournament created after payment:', tournament._id);

        // 4. Cleanup pending
        await PendingTournamentModel.deleteOne({ stripeSessionId: sessionId });
      }

      // If already processed or just created, proceed with side effects if needed
      const tournamentId = tournament._id.toString();

      // Attach to league if applicable (if not already attached)
      if (tournament.league) {
        try {
          // Check if already in league
          const { LeagueModel } = await import('@/database/models/league.model');
          const league = await LeagueModel.findOne({ _id: tournament.league, attachedTournaments: tournament._id });
          
          if (!league) {
            await LeagueService.attachTournamentToLeague(
              tournament.league.toString(),
              tournamentId,
              'system',
              true,
              true
            );
          }
        } catch (leagueErr) {
          console.error('Failed to attach tournament to league during verification:', leagueErr);
        }
      }

      // Generate Invoice if not already done
      if (tournament.billingInfoSnapshot && !tournament.invoiceId) {
        try {
          const invoiceResult = await SzamlazzService.createOacInvoice(tournament, tournament.billingInfoSnapshot);
          if (invoiceResult && invoiceResult.invoiceId) {
            await TournamentModel.findByIdAndUpdate(tournamentId, { invoiceId: invoiceResult.invoiceId });
          }
        } catch (invoiceErr) {
          console.error('Failed to generate invoice:', invoiceErr);
        }
      }

      return NextResponse.redirect(`${baseUrl}/tournaments/${tournament.tournamentId || tournamentId}`);
    }

    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
  } catch (err) {
    console.error('Payment verification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
