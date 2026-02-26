import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { AuthService } from '@/database/services/auth.service';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectMongo();
    const adminCheck = await requireAdmin(request);
    if ('error' in adminCheck) return adminCheck.error;

    const { userId } = await params;
    const user = await UserModel.findById(userId).select('email');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await AuthService.forgotPassword(user.email);

    return NextResponse.json({
      success: true,
      message: 'Reset password email sent',
    });
  } catch (error: any) {
    console.error('Error sending reset email:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to send reset email' },
      { status: 500 }
    );
  }
}
