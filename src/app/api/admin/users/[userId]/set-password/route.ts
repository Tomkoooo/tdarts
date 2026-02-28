import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

const setPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  const adminUser = await UserModel.findById(decoded.id).select('isAdmin');
  if (!adminUser?.isAdmin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const };
}

async function __POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectMongo();
    const adminCheck = await requireAdmin(request);
    if ('error' in adminCheck) return adminCheck.error;

    const { userId } = await params;
    const body = await request.json();
    const { newPassword } = setPasswordSchema.parse(body);

    const user = await UserModel.findById(userId).select('+password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.password = newPassword;
    user.codes.reset_password = null;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error: any) {
    console.error('Error setting user password:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update password' },
      { status: 500 }
    );
  }
}

export const POST = withApiTelemetry('/api/admin/users/[userId]/set-password', __POST as any);
