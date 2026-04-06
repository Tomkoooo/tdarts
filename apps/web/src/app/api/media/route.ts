import { NextRequest, NextResponse } from 'next/server';
import { authorizeUserResult } from '@/features/auth/lib/authorizeUser';
import { MediaService } from '@/database/services/media.service';
import { handleError } from '@/middleware/errorHandle';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUserResult({ request });
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.message }, { status: authResult.status });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const clubId = formData.get('clubId');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const media = await MediaService.createMedia(
      authResult.data.userId,
      buffer,
      file.type || 'application/octet-stream',
      file.name || 'upload',
      file.size,
      typeof clubId === 'string' ? clubId : undefined
    );

    return NextResponse.json({
      success: true,
      mediaId: media._id.toString(),
      url: `/api/media/${media._id.toString()}`,
      mimeType: media.mimeType,
      size: media.size,
      filename: media.filename || file.name,
    });
  } catch (error) {
    const handled = handleError(error);
    return NextResponse.json(handled.body, { status: handled.status });
  }
}
