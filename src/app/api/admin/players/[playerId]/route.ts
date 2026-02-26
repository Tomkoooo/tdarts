import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { connectMongo } from '@/lib/mongoose';
import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';

const honorSchema = z.object({
  title: z.string().trim().min(1).max(100),
  year: z.coerce.number().int().min(1900).max(2100),
  type: z.enum(['rank', 'tournament', 'special']),
  description: z.string().trim().max(250).optional(),
});

const updatePlayerAdminSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  honors: z.array(honorSchema).optional(),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    await connectMongo();
    const adminCheck = await requireAdmin(request);
    if ('error' in adminCheck) return adminCheck.error;

    const { playerId } = await params;
    const payload = updatePlayerAdminSchema.parse(await request.json());
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const player = await PlayerModel.findById(playerId);
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    if (typeof payload.name === 'string') {
      player.name = payload.name;
      if (player.userRef) {
        await UserModel.findByIdAndUpdate(player.userRef, { name: payload.name });
      }
    }

    if (payload.honors) {
      player.honors = payload.honors.map((honor) => ({
        ...honor,
        description: honor.description || undefined,
      }));
    }

    await player.save();

    return NextResponse.json({
      success: true,
      player: {
        _id: player._id,
        name: player.name,
        honors: player.honors || [],
      },
    });
  } catch (error: any) {
    console.error('Error updating player profile by admin:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update player profile' },
      { status: 500 }
    );
  }
}
