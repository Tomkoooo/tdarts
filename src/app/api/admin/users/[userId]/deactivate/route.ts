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

    // Prevent deactivating self
    if (decoded.id === userId) {
      return NextResponse.json({ 
        error: 'Cannot deactivate yourself' 
      }, { status: 400 });
    }

    // Deactivate user (soft delete)
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { isDeleted: true },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deactivated',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        isDeleted: user.isDeleted
      }
    });

  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/admin/users/[userId]/deactivate', __POST as any);
