import { NextResponse } from 'next/server';
import { connectMongo as connectToDatabase } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';
import { BadRequestError, handleError } from '@/middleware/errorHandle';

export async function POST(request: Request) {
  await connectToDatabase();
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    const token = await AuthService.login(email, password);
    const response = NextResponse.json({ message: 'Login successful' });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return response;

  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}