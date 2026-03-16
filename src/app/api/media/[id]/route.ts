import { NextRequest, NextResponse } from 'next/server';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { MediaService } from '@/database/services/media.service';
import { handleError } from '@/middleware/errorHandle';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const media = await MediaService.getMedia(id);
    const body = new Uint8Array(media.data);
    return new NextResponse(body, {
      headers: {
        'Content-Type': media.mimeType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}

export async function DELETE(request: NextRequest, context: Params) {
  try {
    const authResult = await authorizeUserResult({ request });
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const { id } = await context.params;
    await MediaService.deleteMedia(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}
