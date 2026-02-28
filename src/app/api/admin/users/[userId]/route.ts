import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { withApiTelemetry } from '@/lib/api-telemetry';

const updateAdminUserSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  username: z.string().trim().min(3).max(50).optional(),
  email: z.string().email().optional(),
  isVerified: z.boolean().optional(),
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

async function __PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectMongo();
    const adminCheck = await requireAdmin(request);
    if ('error' in adminCheck) return adminCheck.error;

    const { userId } = await params;
    const body = await request.json();
    const payload = updateAdminUserSchema.parse(body);

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (payload.email && payload.email !== user.email) {
      const existingByEmail = await UserModel.findOne({ email: payload.email, _id: { $ne: userId } }).select('_id');
      if (existingByEmail) {
        return NextResponse.json({ error: 'Email is already in use' }, { status: 409 });
      }
      user.email = payload.email;
    }

    if (payload.username && payload.username !== user.username) {
      const existingByUsername = await UserModel.findOne({ username: payload.username, _id: { $ne: userId } }).select('_id');
      if (existingByUsername) {
        return NextResponse.json({ error: 'Username is already in use' }, { status: 409 });
      }
      user.username = payload.username;
    }

    if (typeof payload.name === 'string') {
      user.name = payload.name;
    }

    if (typeof payload.isVerified === 'boolean') {
      user.isVerified = payload.isVerified;
      if (payload.isVerified) {
        user.codes.verify_email = null;
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    console.error('Error updating admin user:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export const PATCH = withApiTelemetry('/api/admin/users/[userId]', __PATCH as any);
