import { NextRequest, NextResponse } from 'next/server';
import { TournamentService } from '@/database/services/tournament.service';
import { ClubService } from '@/database/services/club.service';
import { SubscriptionService } from '@/database/services/subscription.service';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.OAC_STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  const { clubId } = await params;
    const payload = await request.json();
    const club = await ClubService.getClub(clubId);
    if (!club) {
        return NextResponse.json({ error: 'Club not found' }, { status: 404 });
    }

    if (!payload) {
        console.log('Invalid payload');
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    
    if (!payload.boards || payload.boards.length === 0) {
        console.log('No boards provided');
        return NextResponse.json({ error: 'At least one board is required' }, { status: 400 });
    }

    // Authorization check
    const { AuthorizationService } = await import('@/database/services/authorization.service');
    const userId = await AuthorizationService.getUserIdFromRequest(request);
    
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Save billing info to club if provided and requested
    if (payload.billingInfo && payload.saveBillingInfo) {
      await ClubService.updateClub(clubId, userId, {
        billingInfo: payload.billingInfo
      } as any);
    }

    // Check subscription limits (Skip for sandbox tournaments)
    const tournamentStartDate = payload.startDate ? new Date(payload.startDate) : new Date();
    const isSandbox = payload.isSandbox || false;
    const isVerified = payload.verified || false;
    
    // Check subscription limits
    const subscriptionCheck = await SubscriptionService.canCreateTournament(
      clubId, 
      tournamentStartDate,
      isSandbox,
      isVerified
    );
    
    if (!subscriptionCheck.canCreate) {
        console.log('Subscription limit exceeded:', subscriptionCheck.errorMessage);
        return NextResponse.json({ 
            error: subscriptionCheck.errorMessage,
            subscriptionError: true,
            currentCount: subscriptionCheck.currentCount,
            maxAllowed: subscriptionCheck.maxAllowed,
            planName: subscriptionCheck.planName
        }, { status: 403 });
    }

    // Check Verified Tournament constraints (OAC)
    // A club can only create ONE verified tournament per week (Monday-Saturday)
    if (isVerified || payload.leagueId) {
        const { LeagueModel } = await import('@/database/models/league.model');
        const { TournamentModel } = await import('@/database/models/tournament.model');
        
        let leagueIsVerified = false;
        if (payload.leagueId) {
            const league = await LeagueModel.findById(payload.leagueId);
            leagueIsVerified = league?.verified || false;
        }
        
        // Check if this is a verified tournament (either directly or through league)
        if (isVerified || leagueIsVerified) {
            // Calculate start and end of the week (Monday to Saturday) for the tournament start date
            const date = new Date(tournamentStartDate);
            const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
            
            // Calculate Monday of this week
            let daysFromMonday: number;
            if (dayOfWeek === 0) {
                // Sunday - go back 6 days to Monday
                daysFromMonday = 6;
            } else {
                // Monday to Saturday - go back to Monday
                daysFromMonday = dayOfWeek - 1;
            }
            
            const weekStart = new Date(date);
            weekStart.setDate(weekStart.getDate() - daysFromMonday);
            weekStart.setHours(0, 0, 0, 0);
            
            // Saturday end of week
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 5); // Monday + 5 = Saturday
            weekEnd.setHours(23, 59, 59, 999);

            // Check for existing verified tournaments in this week
            const existingVerifiedTournament = await TournamentModel.findOne({
                clubId: clubId,
                verified: true,
                'tournamentSettings.startDate': {
                    $gte: weekStart,
                    $lte: weekEnd
                },
                isDeleted: false,
                isCancelled: false
            });

            if (existingVerifiedTournament) {
                return NextResponse.json({ 
                    error: 'A klubod már létrehozott egy OAC versenyt ezen a héten (hétfőtől vasárnapig). Heti egy OAC verseny engedélyezett.' 
                }, { status: 400 });
            }
        }
    }

    // Tournament alapértelmezett értékek
    const now = new Date();
    const tournamentPayload = {
        clubId: club._id,
        league: payload.leagueId || undefined, 
        tournamentPlayers: [],
        groups: [],
        knockout: [],
        boards: payload.boards || [],
        tournamentSettings: {
            status: 'pending',
            name: payload.name,
            description: payload.description || '',
            startDate: payload.startDate ? new Date(payload.startDate) : now,
            maxPlayers: payload.maxPlayers,
            format: payload.format,
            startingScore: payload.startingScore,
            boardCount: payload.boards?.length || 0,
            entryFee: payload.entryFee,
            tournamentPassword: payload.tournamentPassword,
            location: payload.location || null,
            type: payload.type || 'amateur',
            registrationDeadline: payload.registrationDeadline ? new Date(payload.registrationDeadline) : null,
        },
        createdAt: now,
        updatedAt: now,
        isArchived: false,
        isCancelled: false,
        isSandbox: payload.isSandbox || false,
        verified: payload.verified || false,
        paymentStatus: payload.verified ? 'pending' : 'none',
        billingInfoSnapshot: payload.billingInfo || undefined,
        isActive: !payload.verified, 
    };

    // If OAC, create Stripe session first and DEFER tournament creation
    if (payload.verified) {
      const { PendingTournamentModel } = await import('@/database/models/pendingTournament.model');
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'huf',
              product_data: {
                name: `OAC Tournament Verification - ${payload.name}`,
                description: 'Hitelesített OAC verseny létrehozási díj',
              },
              unit_amount: 381000, 
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/api/payments/verify?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/clubs/${clubId}`,
        metadata: {
          clubId: clubId,
        }
      });

      // Save payload to pending tournaments
      await PendingTournamentModel.create({
        stripeSessionId: session.id,
        payload: tournamentPayload
      });

      return NextResponse.json({ checkoutUrl: session.url });
    }
    
    // Regular Tournament Creation (Immediate)
    const newTournament = await TournamentService.createTournament(tournamentPayload as any);
    
    console.log('Created tournament boards:', JSON.stringify(newTournament.boards, null, 2));
    console.log('================================');

    // Attach tournament to league if leagueId is provided
    if (payload.leagueId && newTournament) {
        try {
            const { LeagueService } = await import('@/database/services/league.service');
            const { AuthorizationService } = await import('@/database/services/authorization.service');
            
            const userId = await AuthorizationService.getUserIdFromRequest(request);
            if (userId) {
                await LeagueService.attachTournamentToLeague(payload.leagueId, newTournament._id.toString(), userId);
                console.log('Tournament attached to league successfully');
            }
        } catch (error) {
            console.error('Error attaching tournament to league:', error);
        }
    }
    
    return NextResponse.json(newTournament);
}
