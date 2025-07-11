import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError, handleError } from '@/middleware/errorHandle';

// POST /api/auth/verify-email végpont az email verifikációhoz
export async function POST(request: NextRequest) {
  await connectMongo();
  try {
    const { email, code } = await request.json();
    if (!email || !code) {
      throw new BadRequestError('Email and code are required');
    }
    await AuthService.verifyEmail(email, code);
    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}