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
      token, // Return token in body for cross-origin usage
      user: {
        _id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        country: user.country || null,
        locale: user.locale || 'hu',
      },
    });

    // Set the token as an HTTP-only cookie
    // Note: For cross-origin (3rd party site), SameSite=None and Secure=true is required.
    // However, this requires HTTPS. For localhost development, this might be tricky.
    // We return the token in the body so the client can store it in localStorage/memory if needed.
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 60 * 60 * 24 * 180, // 180 days
      sameSite: 'lax', // Changed from strict to lax to allow some cross-site navigation, but for API calls token in body is safer
      path: '/',
    });

    return response;

  } catch (error) {
    const { status, body } = handleError(error);
    return NextResponse.json(body, { status });
  }
}