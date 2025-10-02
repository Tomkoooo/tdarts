import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import { BadRequestError } from '@/middleware/errorHandle';

export async function POST(request: NextRequest) {
    const { email, code } = await request.json();
    if (!email || !code) {
        throw new BadRequestError('Email and code are required');
    }
    const { token, user } = await AuthService.verifyOTP(email, code);
    const response = NextResponse.json({
        message: 'Login successful',
        user: {
          _id: user._id.toString(),
          username: user.username,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin,
          twoFactorAuth: user.twoFactorAuth,
        },
      });
    response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 180, // 180 days
        sameSite: 'strict',
        path: '/',
    });
    return response;
}