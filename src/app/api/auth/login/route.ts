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

    // Authenticate the user and get the token
    const { token, user } = await AuthService.login(email, password);

    // Create the response with the user object and token
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        username: user.username,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      },
    });

    // Set the token as an HTTP-only cookie
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