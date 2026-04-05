import { BadRequestError, ValidationError } from '@tdarts/core';
import { paymentVerifySchema } from '@tdarts/schemas';
import { PaymentsService } from '@tdarts/services';
import { json, unauthorizedCaller, unauthorizedUser, type NativeRouteMode } from './restCommon';
import { requireMobileTier1, resolveAuthedUserId } from './authUser';

/**
 * POST /api/payments/verify — JSON { sessionId } (Stripe Checkout). Tier 1 + JWT on mobile.
 */
export async function handlePaymentsVerifyPost(
  req: Request,
  opts: { mode: NativeRouteMode },
): Promise<Response> {
  if (!requireMobileTier1(opts.mode, req.headers)) return unauthorizedCaller();
  const userId = await resolveAuthedUserId(req, opts.mode);
  if (!userId) return unauthorizedUser();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = paymentVerifySchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  try {
    const result = await PaymentsService.verifyCheckoutSessionForUser(userId, parsed.data.sessionId);
    return json(result);
  } catch (err: unknown) {
    if (err instanceof ValidationError) {
      return json({ error: err.message, errorCode: err.errorCode }, err.statusCode);
    }
    if (err instanceof BadRequestError) {
      return json({ error: err.message, errorCode: err.errorCode }, err.statusCode);
    }
    const msg = err instanceof Error ? err.message : 'Verification failed';
    return json({ error: msg }, 500);
  }
}
