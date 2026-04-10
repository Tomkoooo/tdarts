'use server';

import { z } from 'zod';
import { authorizeUserResult, assertEligibilityResult } from '@/shared/lib/guards';
import { BadRequestError } from '@/middleware/errorHandle';
import { withTelemetry } from '@/shared/lib/withTelemetry';
import { resolveGuardAwareStatus } from '@/shared/lib/guards/result';
import { GuardFailureResult } from '@/shared/lib/telemetry/types';
import {
  isVerifyOacCheckoutErrorResult,
  resolvePaymentRedirectLocaleFromCookies,
  verifyOacTournamentCheckout,
} from '@/features/payments/lib/verifyOacCheckout';

const verifyPaymentInputSchema = z.object({
  sessionId: z.string().min(1, 'Missing parameters'),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentInputSchema>;

type VerifyPaymentResult =
  | { kind: 'redirect'; location: string }
  | { kind: 'error'; status: number; body: { error: string } }
  | GuardFailureResult;

function isVerifyPaymentErrorResult(result: unknown): result is { kind: 'error'; status: number } {
  return isVerifyOacCheckoutErrorResult(result);
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

      const locale = await resolvePaymentRedirectLocaleFromCookies();
      return verifyOacTournamentCheckout(parsedInput.data.sessionId, locale);
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
