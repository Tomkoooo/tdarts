import { BadRequestError } from '@tdarts/core';
import Stripe from 'stripe';

export type CheckoutVerifyResult = {
  ok: boolean;
  paymentStatus: string | null;
  sessionId: string;
  customerEmail: string | null;
};

/**
 * Verifies a Stripe Checkout session (e.g. after redirect from paywall).
 * Requires STRIPE_SECRET_KEY on the API runtime.
 */
export class PaymentsService {
  static async verifyCheckoutSessionForUser(
    userId: string,
    sessionId: string,
  ): Promise<CheckoutVerifyResult> {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    if (!secret) {
      throw new BadRequestError('Payment verification is not configured', 'api', {
        errorCode: 'PAYMENTS_NOT_CONFIGURED',
        expected: true,
        operation: 'payments.verifyCheckoutSessionForUser',
      });
    }

    try {
    const stripe = new Stripe(secret, { apiVersion: '2026-02-25.clover' });
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const metaUser = session.metadata?.userId ?? session.metadata?.user_id;
    if (metaUser && metaUser !== userId) {
      throw new BadRequestError('Session does not belong to this user', 'api', {
        errorCode: 'PAYMENTS_SESSION_USER_MISMATCH',
        expected: true,
        operation: 'payments.verifyCheckoutSessionForUser',
      });
    }

    return {
      ok: session.payment_status === 'paid',
      paymentStatus: session.payment_status,
      sessionId: session.id,
      customerEmail: session.customer_details?.email ?? null,
    };
    } catch (e: unknown) {
      if (e instanceof BadRequestError) throw e;
      const msg = e instanceof Error ? e.message : 'Payment provider error';
      throw new BadRequestError(msg, 'api', {
        errorCode: 'PAYMENTS_PROVIDER_ERROR',
        expected: true,
        operation: 'payments.verifyCheckoutSessionForUser',
      });
    }
  }
}
