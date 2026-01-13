import { NextRequest, NextResponse } from 'next/server';
import { MediaService } from '@/database/services/media.service';
import { AuthorizationService } from '@/database/services/authorization.service';

export async function POST(req: NextRequest) {
  try {
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const clubId = formData.get('clubId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Max 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 15MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const media = await MediaService.createMedia(
      userId,
      buffer,
      file.type,
      file.name,
      file.size,
      clubId
    );

    return NextResponse.json({ 
        url: `/api/media/${media._id}`, 
        id: media._id 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
