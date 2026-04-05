import { NextRequest, NextResponse } from 'next/server';
import { PlayerService } from '@/database/services/player.service';
import { UserModel } from '@/database/models/user.model';
import { connectMongo } from '@/lib/mongoose';
import { handleError } from '@/middleware/errorHandle';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await connectMongo();

    const player = await PlayerService.findPlayerById(id);
    if (!player) {
      return NextResponse.json({ success: true, imageUrl: null });
    }

    let imageUrl: string | null = (player as any).profilePicture || null;
    if (!imageUrl && (player as any).userRef) {
      const user = await UserModel.findById((player as any).userRef).select('profilePicture');
      imageUrl = (user?.profilePicture as string | undefined) || null;
    }

    return NextResponse.json(
      { success: true, imageUrl },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}
