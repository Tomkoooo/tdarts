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
    
    // Verify email and get user data
    const { user, token } = await AuthService.verifyEmail(email, code);
    
    // Create response with user data
    const response = NextResponse.json({ 
      message: 'Email verified successfully',
      user: {
        _id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      }
    }, { status: 200 });

    // Set the token as an HTTP-only cookie for automatic login
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 180, // 180 days
      sameSite: 'strict',
      path: '/',
    });

    return response;
  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}