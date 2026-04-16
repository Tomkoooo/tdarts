import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthService } from '@tdarts/services';
import { withApiTelemetry } from '@/lib/api-telemetry';
import { handleError } from '@/middleware/errorHandle';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  confirmPassword: z.string().optional(),
  name: z.string().min(1),
  username: z.string().min(1).optional(),
});

async function __POST(request: NextRequest) {
  try {
    const json = await request.json();
    const body = bodySchema.parse(json);
    await AuthService.register({
      email: body.email,
      password: body.password,
      name: body.name,
      username: body.username ?? body.email.split('@')[0],
    });
    return NextResponse.json({ message: 'User registered' }, { status: 200 });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}

export const POST = withApiTelemetry('/api/auth/register', __POST as any);
