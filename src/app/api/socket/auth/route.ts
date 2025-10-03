import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';

// Environment variables will be checked inside the function

export async function POST(request: NextRequest) {
  try {
    // Check environment variables
    const JWT_SECRET = process.env.SOCKET_JWT_SECRET;

    if (!JWT_SECRET) {
      return NextResponse.json({ 
        error: 'Socket authentication not configured. Please set SOCKET_JWT_SECRET environment variable.' 
      }, { status: 503 });
    }

    await connectMongo();
    
    // Try to get user from JWT token (optional)
    const token = request.cookies.get('token')?.value;
    let userId = null;
    let userRole = 'guest';

    if (token) {
      try {
        const user = await AuthService.verifyToken(token);
        if (user) {
          userId = user._id.toString();
          userRole = user.isAdmin ? 'admin' : 'user';
        }
      } catch (error: any) {
        // Token is invalid, but we allow guest access
        console.log('Invalid token, allowing guest access:', error?.message || 'Unknown error');
      }
    }

    // Generate socket JWT token (for both authenticated and guest users)
    const socketToken = jwt.sign(
      {
        userId: userId || 'guest',
        userRole: userRole,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
      },
      JWT_SECRET
    );

    return NextResponse.json({
      success: true,
      token: socketToken
    });

  } catch (error: any) {
    console.error('Socket auth error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate socket token',
      details: error.message 
    }, { status: 500 });
  }
}
