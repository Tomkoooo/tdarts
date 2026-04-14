import Stripe from 'stripe';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { TournamentService, LeagueService } from '@tdarts/services';
import { SzamlazzService } from '@/lib/szamlazz';
import { connectMongo } from '@/lib/mongoose';
import type { SupportedLocale } from '@/lib/locale-mismatch';
import {
  deletePendingTournamentByStripeSessionId,
  findLeagueByIdWithAttachedTournament,
  findPendingTournamentByStripeSessionId,
  findTournamentByStripeSessionId,
  setTournamentInvoiceId,
} from '@/features/payments/lib/paymentVerification.db';

let _stripeClient: Stripe | null = null;

function getOacStripeClient(): Stripe {
  if (!_stripeClient) {
    const key = process.env.OAC_STRIPE_SECRET_KEY?.trim();
    if (!key) {
      throw new Error('OAC_STRIPE_SECRET_KEY is not configured');
    }
    _stripeClient = new Stripe(key, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
    });
  }
  return _stripeClient;
}

export type VerifyOacCheckoutResult =
  | { kind: 'redirect'; location: string }
  | { kind: 'error'; status: number; body: { error: string } };

function isStripeInvalidRequest(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const maybeStripe = error as Error & { type?: string; code?: string };
  return (
    maybeStripe.type === 'StripeInvalidRequestError' ||
    maybeStripe.code === 'resource_missing' ||
    /no such checkout\.session|invalid.+session/i.test(maybeStripe.message)
  );
}

export function buildLocalizedTournamentUrl(
  baseUrl: string,
  locale: SupportedLocale,
  tournamentPublicId: string
): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/${locale}/tournaments/${encodeURIComponent(tournamentPublicId)}`;
}

export function buildLocalizedClubUrl(baseUrl: string, locale: SupportedLocale, clubId: string): string {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/${locale}/clubs/${encodeURIComponent(clubId)}`;
}

/** Server action / route: prefer request cookies, else next/headers cookies (e.g. modal has no Request). */
export async function resolvePaymentLocaleForServerAction(
  request?: NextRequest
): Promise<SupportedLocale> {
  if (request?.cookies?.get) {
    return resolvePaymentRedirectLocaleFromRequest(request);
  }
  return resolvePaymentRedirectLocaleFromCookies();
}

export function resolvePaymentRedirectLocaleFromRequest(request: NextRequest): SupportedLocale {
  const v = request.cookies.get('NEXT_LOCALE')?.value ?? request.cookies.get('locale')?.value;
  if (v === 'hu' || v === 'en' || v === 'de') return v;
  return 'hu';
}

export async function resolvePaymentRedirectLocaleFromCookies(): Promise<SupportedLocale> {
  const c = await cookies();
  const v = c.get('NEXT_LOCALE')?.value ?? c.get('locale')?.value;
  if (v === 'hu' || v === 'en' || v === 'de') return v;
  return 'hu';
}

/**
 * OAC verified tournament: promote pending → tournament after Stripe paid, then return redirect URL.
 * Caller must authenticate and run eligibility guards before calling.
 */
export async function verifyOacTournamentCheckout(
  sessionId: string,
  locale: SupportedLocale
): Promise<VerifyOacCheckoutResult> {
  await connectMongo();

  const stripe = getOacStripeClient();

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
  const publicCode = String(tournament.tournamentId || tournamentId);

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
    location: buildLocalizedTournamentUrl(baseUrl, locale, publicCode),
  };
}

export function isVerifyOacCheckoutErrorResult(
  result: unknown
): result is { kind: 'error'; status: number } {
  if (!result || typeof result !== 'object') return false;
  const candidate = result as { kind?: unknown; status?: unknown };
  return candidate.kind === 'error' && typeof candidate.status === 'number';
}
