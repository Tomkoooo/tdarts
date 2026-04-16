import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@tdarts/services';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { handleError } from '@/middleware/errorHandle';

const bodySchema = z.object({
  email: z.string().email(),
});

async function __POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    await AuthService.requestMagicLogin(body.email);
    return NextResponse.json({ ok: true, message: 'If an account exists, a sign-in link was sent.' }, { status: 200 });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}

export const POST = withApiTelemetry('/api/auth/request-magic-link', __POST as any);
