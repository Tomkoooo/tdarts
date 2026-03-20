'use server';

import Stripe from 'stripe';
import { TournamentService } from '@/database/services/tournament.service';
import { LeagueService } from '@/database/services/league.service';
import { z } from 'zod';
import { SzamlazzService } from '@/lib/szamlazz';
import { connectMongo } from '@/lib/mongoose';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { GuardFailureResult } from '@/shared/lib/telemetry/types';
import {
  deletePendingTournamentByStripeSessionId,
  findLeagueByIdWithAttachedTournament,
  findPendingTournamentByStripeSessionId,
  findTournamentByStripeSessionId,
  setTournamentInvoiceId,
} from '@/features/payments/lib/paymentVerification.db';

const stripe = new Stripe(process.env.OAC_STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
});

const verifyPaymentInputSchema = z.object({
  sessionId: z.string().min(1, 'Missing parameters'),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentInputSchema>;

type VerifyPaymentResult =
  | { kind: 'redirect'; location: string }
  | { kind: 'error'; status: number; body: { error: string } }
  | GuardFailureResult;

function isStripeInvalidRequest(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const maybeStripe = error as Error & { type?: string; code?: string };
  return (
    maybeStripe.type === 'StripeInvalidRequestError' ||
    maybeStripe.code === 'resource_missing' ||
    /no such checkout\\.session|invalid.+session/i.test(maybeStripe.message)
  );
}

function isVerifyPaymentErrorResult(result: unknown): result is { kind: 'error'; status: number } {
  if (!result || typeof result !== 'object') {
    return false;
  }

  const candidate = result as { kind?: unknown; status?: unknown };
  return candidate.kind === 'error' && typeof candidate.status === 'number';
}

export async function verifyPaymentAction(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const run = withTelemetry(
    'payments.verifyCheckout',
    async (payload: VerifyPaymentInput): Promise<VerifyPaymentResult> => {
      const authResult = await authorizeUserResult();
      if (!authResult.ok) {
        return authResult;
      }

      const parsedInput = verifyPaymentInputSchema.safeParse(payload);
      if (!parsedInput.success) throw new BadRequestError(parsedInput.error.issues[0]?.message || 'Missing parameters');

      const eligibilityResult = await assertEligibilityResult({ allowPaidOverride: true });
      if (!eligibilityResult.ok) {
        return eligibilityResult;
      }
      await connectMongo();
      const { sessionId } = parsedInput.data;
      let session: Stripe.Response<Stripe.Checkout.Session>;
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId);
      } catch (error) {
        if (isStripeInvalidRequest(error)) {
          return { kind: 'error', status: 400, body: { error: 'Invalid session_id' } };
        }
        throw error;
      }

      if (session.payment_status !== 'paid') {
        return { kind: 'error', status: 400, body: { error: 'Payment not completed' } };
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      let tournament = await findTournamentByStripeSessionId(sessionId);

      if (!tournament) {
        const pending = await findPendingTournamentByStripeSessionId(sessionId);
        if (!pending) {
          return { kind: 'error', status: 404, body: { error: 'Pending tournament not found' } };
        }

        const tournamentPayload = {
          ...pending.payload,
          paymentStatus: 'paid',
          isActive: true,
          stripeSessionId: sessionId,
        };

        tournament = await TournamentService.createTournament(tournamentPayload);
        await deletePendingTournamentByStripeSessionId(sessionId);
      }

      const tournamentId = tournament._id.toString();

      const sideEffects: Promise<unknown>[] = [];

      if (tournament.league) {
        sideEffects.push(
          (async () => {
            const league = await findLeagueByIdWithAttachedTournament(tournament.league.toString(), tournament._id);
            if (!league) {
              await LeagueService.attachTournamentToLeague(
                tournament.league.toString(),
                tournamentId,
                'system',
                true,
                true
              );
            }
          })()
        );
      }

      if (tournament.billingInfoSnapshot && !tournament.invoiceId) {
        sideEffects.push(
          (async () => {
            const invoiceResult = await SzamlazzService.createOacInvoice(tournament, tournament.billingInfoSnapshot);
            if (invoiceResult && invoiceResult.invoiceId) {
              await setTournamentInvoiceId(tournamentId, invoiceResult.invoiceId);
            }
          })()
        );
      }

      if (sideEffects.length > 0) {
        const results = await Promise.allSettled(sideEffects);
        for (const result of results) {
          if (result.status === 'rejected') {
            console.error('Non-blocking payment verify side effect failed:', result.reason);
          }
        }
      }

      return {
        kind: 'redirect',
        location: `${baseUrl}/tournaments/${tournament.tournamentId || tournamentId}`,
      };
    },
    {
      method: 'ACTION',
      metadata: {
        feature: 'payments',
        actionName: 'verifyCheckout',
      },
      resolveStatus: (result) => {
        const guardStatus = resolveGuardAwareStatus(result);
        if (guardStatus >= 400) return guardStatus;
        if (isVerifyPaymentErrorResult(result)) {
          return result.status;
        }
        return 200;
      },
    }
  );

  return run(input);
}
