import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import jwt from 'jsonwebtoken';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectMongo();
    const { userId } = await params;
    
    // Verify admin access
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
    
    if (!adminUser?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent removing admin from self
    if (decoded.id === userId) {
      return NextResponse.json({ 
        error: 'Cannot remove admin status from yourself' 
      }, { status: 400 });
    }

    // Update user to remove admin
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { isAdmin: false },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Admin status removed',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Error removing admin status:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/admin/users/[userId]/remove-admin', __POST as any);
