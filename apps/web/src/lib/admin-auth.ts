import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { UserModel } from '@tdarts/core';
import { connectMongo } from '@/lib/mongoose';

type JwtPayload = { id: string };

export async function getAdminUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get('token')?.value;
  if (!token) return null;

  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  } catch {
    return null;
  }

  await connectMongo();
  const user = await UserModel.findById(decoded.id).select('isAdmin');
  if (!user?.isAdmin) return null;
  return String(decoded.id);
}

export async function ensureAdmin(request: NextRequest): Promise<{ userId: string } | { response: NextResponse }> {
  const userId = await getAdminUserIdFromRequest(request);
  if (!userId) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { userId };
}
