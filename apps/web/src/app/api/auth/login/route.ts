import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@/database/services/auth.service';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { handleError } from '@/middleware/errorHandle';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function __POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    const { token, user } = await AuthService.login(email, password);

    const response = NextResponse.json(
      {
        success: true,
        user: {
          _id: user._id?.toString?.() || String(user._id),
          username: user.username,
          email: user.email,
          name: user.name,
          isAdmin: Boolean(user.isAdmin),
          isVerified: Boolean(user.isVerified),
          country: user.country || null,
          locale: user.locale || 'hu',
        },
      },
      { status: 200 }
    );

    response.cookies.set('token', token, {
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

export const POST = withApiTelemetry('/api/auth/login', __POST as any);
