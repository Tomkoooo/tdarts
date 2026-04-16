import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@tdarts/services';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { handleError } from '@/middleware/errorHandle';

const bodySchema = z.object({
  token: z.string().min(16),
});

async function __POST(request: NextRequest) {
  try {
    const body = bodySchema.parse(await request.json());
    const { token: jwtToken, user } = await AuthService.verifyEmailWithToken(body.token);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          _id: String(user._id),
          username: user.username,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified,
          country: user.country ?? null,
          termsAcceptedAt: user.termsAcceptedAt
            ? user.termsAcceptedAt instanceof Date
              ? user.termsAcceptedAt.toISOString()
              : String(user.termsAcceptedAt)
            : null,
          needsProfileCompletion: AuthService.needsProfileCompletion(user),
        },
      },
      { status: 200 },
    );

    response.cookies.set('token', jwtToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}

export const POST = withApiTelemetry('/api/auth/verify-email-token', __POST as any);
