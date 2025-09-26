import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/database/services/auth.service';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';

const JWT_SECRET = process.env.SOCKET_JWT_SECRET;
const SOCKET_API_KEY = process.env.SOCKET_API_KEY;

if (!JWT_SECRET) {
  throw new Error('SOCKET_JWT_SECRET environment variable is required');
}

if (!SOCKET_API_KEY) {
  throw new Error('SOCKET_API_KEY environment variable is required');
}

export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    
    // Get user from JWT token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await AuthService.verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate socket JWT token
    const socketToken = jwt.sign(
      {
        userId: user._id.toString(),
        userRole: user.isAdmin ? 'admin' : 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
      },
      JWT_SECRET
    );

    return NextResponse.json({
      success: true,
      token: socketToken,
      apiKey: SOCKET_API_KEY
    });

  } catch (error: any) {
    console.error('Socket auth error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate socket token',
      details: error.message 
    }, { status: 500 });
  }
}
