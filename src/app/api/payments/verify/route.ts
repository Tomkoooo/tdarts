import { NextRequest, NextResponse } from 'next/server';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { verifyPaymentAction } from '@/features/payments/actions/verifyPayment.action';
import { isGuardFailureResult } from '@/shared/lib/guards/result';

async function __GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  try {
    const result = await verifyPaymentAction({ sessionId: sessionId || '' });
    if (isGuardFailureResult(result)) {
      return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    }
    if (result.kind === 'redirect') {
      return NextResponse.redirect(result.location);
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (err) {
    console.error('Payment verification error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/payments/verify', __GET as any);
