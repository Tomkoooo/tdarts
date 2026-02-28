import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
  try {
    await connectMongo();
    
    // Get JWT token from cookies
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ isAdmin: false });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!user?.isAdmin) {
      return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ 
      isAdmin: user || false 
    });

  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json({ isAdmin: false });
  }
}

export const GET = withApiTelemetry('/api/admin/check-status', __GET as any);
