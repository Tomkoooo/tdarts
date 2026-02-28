import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/database/models/user.model';
import { AuthorizationService } from '@/database/services/authorization.service';
import { connectMongo } from '@/lib/mongoose';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectMongo();

    // Check for internal secret (for OAC Portal access)
    const internalSecret = req.headers.get('x-internal-secret');
    const expectedSecret = process.env.INTERNAL_API_SECRET || 'development-secret-change-in-production';
    
    // If internal secret is provided and correct, allow access
    const isInternalRequest = internalSecret === expectedSecret;
    console.log('isInternalRequest', isInternalRequest);
    console.log('internalSecret', internalSecret);
    console.log('expectedSecret', expectedSecret);
    // Otherwise check user authentication
    if (!isInternalRequest) {
      const userId = await AuthorizationService.getUserIdFromRequest(req);
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Fetch user from database
    const user = await UserModel.findById(userId).select('name email _id');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      _id: user._id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/users/[userId]', __GET as any);
