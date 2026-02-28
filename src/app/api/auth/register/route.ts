import { NextResponse } from 'next/server';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';
import { BadRequestError, handleError } from '@/middleware/errorHandle';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(request: Request) {
  await connectToDatabase();
  try {
    const { email, password, confirmPassword, name, username } = await request.json();
    if (!email || !password || !name) {
      throw new BadRequestError('Email, password, and name are required');
    }
    if (password !== confirmPassword) {
      throw new BadRequestError('Passwords do not match');
    }
    const userObject = { email, password, name, username };
    await AuthService.register(userObject);
    return NextResponse.json(
      { message: 'User registered'},
      { status: 200 }
    );
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}

export const POST = withApiTelemetry('/api/auth/register', __POST as any);
