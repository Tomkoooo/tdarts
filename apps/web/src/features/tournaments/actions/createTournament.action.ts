'use server';

import Stripe from 'stripe';
import { revalidateTag } from 'next/cache';
import { TournamentService, ClubService, SubscriptionService, LeagueService } from '@tdarts/services';
import { z } from 'zod';
import { parseIsoDateInput } from '@/lib/date-time';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { isSubscriptionPaywallActive } from '@/features/flags/lib/subscriptionPaywall';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { AuthorizationService } from '@tdarts/services';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { GuardFailureResult } from '@/shared/lib/telemetry/types';
import {
  createPendingTournament,
  findExistingVerifiedTournamentForWeek,
  findLeagueById,
} from '@/features/tournaments/lib/tournamentCreation.db';
import {
  buildLocalizedClubUrl,
  resolvePaymentLocaleForServerAction,
} from '@/features/payments/lib/verifyOacCheckout';
import {
  ENTRY_FEE_CURRENCY_CODES,
  normalizeEntryFeeCurrency,
} from '@tdarts/core/entry-fee-currency';

const stripe = new Stripe(process.env.OAC_STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
});

const entryFeeCurrencySchema = z.enum(
  [...ENTRY_FEE_CURRENCY_CODES] as [string, ...string[]]
);

const tournamentPayloadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  boards: z.array(z.record(z.string(), z.unknown())).min(1),
  maxPlayers: z.number().optional(),
  format: z.string().optional(),
  startingScore: z.number().optional(),
  entryFee: z.number().optional(),
  entryFeeCurrency: entryFeeCurrencySchema.optional(),
  tournamentPassword: z.string().optional(),
  location: z.string().nullable().optional(),
  type: z.string().optional(),
  registrationDeadline: z.string().optional(),
  participationMode: z.string().optional(),
  startDate: z.string().optional(),
  isSandbox: z.boolean().optional(),
  verified: z.boolean().optional(),
  leagueId: z.string().optional(),
  billingInfo: z.record(z.string(), z.unknown()).optional(),
  saveBillingInfo: z.boolean().optional(),
});

export type CreateTournamentPayload = z.infer<typeof tournamentPayloadSchema>;

export type CreateTournamentInput = {
  request?: import('next/server').NextRequest;
  clubId: string;
  payload: CreateTournamentPayload;
};

export type CreateTournamentActionResult =
  | { tournamentId: string; code: string; id: string }
  | { checkoutUrl: string | null }
  | GuardFailureResult;

export async function createTournamentAction(input: CreateTournamentInput): Promise<CreateTournamentActionResult> {
  const run = withTelemetry(
    'tournaments.createTournament',
    async (params: CreateTournamentInput) => {
      const { clubId, request } = params;

      const authResult = await authorizeUserResult(request ? { request } : undefined);
      if (!authResult.ok) {
        return { ok: false, code: 'LOGIN_REQUIRED', status: 401, message: authResult.message } satisfies GuardFailureResult;
      }
      const userId = authResult.data.userId;

      const hasPermission = await AuthorizationService.checkAdminOrModerator(userId, clubId);
      if (!hasPermission) {
        return { ok: false, code: 'PERMISSION_REQUIRED', status: 403, message: 'Insufficient permissions' } satisfies GuardFailureResult;
      }

      const club = await ClubService.getClub(clubId);
      if (!club) {
        throw new BadRequestError('Club not found');
      }

      const parsedPayload = tournamentPayloadSchema.safeParse(params.payload);
      if (!parsedPayload.success) {
        throw new BadRequestError(parsedPayload.error.issues[0]?.message || 'Invalid payload');
      }
      const payload = parsedPayload.data;

      if (payload.billingInfo && payload.saveBillingInfo) {
        await ClubService.updateClub(clubId, userId, {
          billingInfo: payload.billingInfo,
        } as Record<string, unknown>);
      }

      const parsedStartDate = payload.startDate ? parseIsoDateInput(payload.startDate) : null;
      if (payload.startDate && !parsedStartDate) {
        throw new BadRequestError('Invalid startDate. Expected ISO date with timezone.');
      }
      const parsedRegistrationDeadline = payload.registrationDeadline
        ? parseIsoDateInput(payload.registrationDeadline)
        : null;
      if (payload.registrationDeadline && !parsedRegistrationDeadline) {
        throw new BadRequestError('Invalid registrationDeadline. Expected ISO date with timezone.');
      }

      const tournamentStartDate = parsedStartDate || new Date();
      const isSandbox = payload.isSandbox || false;
      const isVerified = payload.verified || false;

      if (isSubscriptionPaywallActive()) {
        const subscriptionCheck = await SubscriptionService.canCreateTournament(
          clubId,
          tournamentStartDate,
          isSandbox,
          isVerified
        );

        if (!subscriptionCheck.canCreate) {
          return {
            ok: false,
            code: 'SUBSCRIPTION_REQUIRED',
            status: 403,
            message: subscriptionCheck.errorMessage || 'Subscription limit exceeded',
          } satisfies GuardFailureResult;
        }
      }

      if (isVerified || payload.leagueId) {
        let leagueIsVerified = false;
        if (payload.leagueId) {
          const league = await findLeagueById(payload.leagueId);
          leagueIsVerified = league?.verified || false;
        }

        if (isVerified || leagueIsVerified) {
          const date = new Date(tournamentStartDate);
          const dayOfWeek = date.getDay();
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - daysFromMonday);
          weekStart.setHours(0, 0, 0, 0);

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 5);
          weekEnd.setHours(23, 59, 59, 999);

          const existingVerifiedTournament = await findExistingVerifiedTournamentForWeek(clubId, weekStart, weekEnd);

          if (existingVerifiedTournament) {
            throw new BadRequestError(
              'A klubod mar letrehozott egy OAC versenyt ezen a heten (hetfotol vasarnapig). Heti egy OAC verseny engedelyezett.'
            );
          }
        }
      }

      const now = new Date();
      const entryFeeCurrency = normalizeEntryFeeCurrency(payload.entryFeeCurrency);

      const tournamentPayload: Record<string, unknown> = {
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
          startDate: parsedStartDate || now,
          maxPlayers: payload.maxPlayers,
          format: payload.format,
          startingScore: payload.startingScore,
          boardCount: payload.boards?.length || 0,
          entryFee: payload.entryFee,
          entryFeeCurrency,
          tournamentPassword: payload.tournamentPassword,
          location: payload.location || null,
          type: payload.type || 'amateur',
          registrationDeadline: parsedRegistrationDeadline || null,
          participationMode: payload.participationMode || 'individual',
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

      if (payload.verified) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const locale = await resolvePaymentLocaleForServerAction(request);
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'huf',
                product_data: {
                  name: `OAC Tournament Verification - ${payload.name}`,
                  description: 'Hitelesitett OAC verseny letrehozasi dij',
                },
                unit_amount: 381000,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${baseUrl}/api/payments/verify?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: buildLocalizedClubUrl(baseUrl, locale, clubId),
          metadata: { clubId },
        });

        await createPendingTournament(checkoutSession.id, tournamentPayload);

        return { checkoutUrl: checkoutSession.url };
      }

      const newTournament = await TournamentService.createTournament(tournamentPayload);
      revalidateTag('search', 'max');
      revalidateTag('home:tournaments', 'max');

      if (payload.leagueId && newTournament) {
        try {
          await LeagueService.attachTournamentToLeague(
            payload.leagueId,
            newTournament._id.toString(),
            userId
          );
        } catch (error) {
          console.error('Error attaching tournament to league:', error);
        }
      }

      const createdTournamentCode = String(newTournament.tournamentId || newTournament._id);
      return {
        tournamentId: createdTournamentCode,
        code: createdTournamentCode,
        id: newTournament._id.toString(),
      };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'tournaments',
        actionName: 'createTournament',
        clubId: input.clubId,
      },
      resolveStatus: resolveGuardAwareStatus,
    }
  );

  return run(input);
}
