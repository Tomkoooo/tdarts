import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { TournamentModel } from '@/database/models/tournament.model';
import { SzamlazzService } from '@/lib/szamlazz';
import { connectMongo } from '@/lib/mongoose';

const stripe = new Stripe(process.env.OAC_STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  const tournamentId = searchParams.get('tournamentId');

  if (!sessionId || !tournamentId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    await connectMongo();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const tournament = await TournamentModel.findById(tournamentId);
      
      if (!tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
      }

      // If already paid, just redirect
      if (tournament.paymentStatus === 'paid') {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        return NextResponse.redirect(`${baseUrl}/tournaments/${tournament.tournamentId || tournament._id}`);
      }

      // Activate tournament
      await TournamentModel.findByIdAndUpdate(tournamentId, {
        paymentStatus: 'paid',
        isActive: true,
      });

      // Generate Invoice Snapshot
      if (tournament.billingInfoSnapshot) {
        try {
          await SzamlazzService.createOacInvoice(tournament, tournament.billingInfoSnapshot);
        } catch (invoiceErr) {
          console.error('Failed to generate invoice, but payment was successful:', invoiceErr);
          // We don't fail the verification if only invoicing fails, but we log it
        }
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/tournaments/${tournament.tournamentId || tournament._id}`);
    }

    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
  } catch (err) {
    console.error('Payment verification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
