import { NextRequest, NextResponse } from 'next/server';
import { handlePaymentsVerifyPost } from '@tdarts/api/rest-handlers';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { assertEligibilityResult } from '@/features/flags/lib/eligibility';
import {
  resolvePaymentRedirectLocaleFromRequest,
  verifyOacTournamentCheckout,
} from '@/features/payments/lib/verifyOacCheckout';

export async function POST(request: Request) {
  return handlePaymentsVerifyPost(request, { mode: 'web' });
}

/**
 * Stripe Checkout success_url uses a browser GET with session_id.
 * Runs the same OAC promotion as verifyPaymentAction.
 */
export async function GET(request: NextRequest) {
  const authResult = await authorizeUserResult({ request });
  if (!authResult.ok) {
    return NextResponse.json({ error: authResult.message }, { status: authResult.status });
  }

  const eligibilityResult = await assertEligibilityResult({ allowPaidOverride: true });
  if (!eligibilityResult.ok) {
    return NextResponse.json({ error: eligibilityResult.message }, { status: eligibilityResult.status });
  }

  const url = new URL(request.url);
  const sessionId = (url.searchParams.get('session_id') ?? url.searchParams.get('sessionId') ?? '').trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const locale = resolvePaymentRedirectLocaleFromRequest(request);
  const result = await verifyOacTournamentCheckout(sessionId, locale);

  if (result.kind === 'error') {
    return NextResponse.json(result.body, { status: result.status });
  }

  return NextResponse.redirect(result.location, 303);
}
