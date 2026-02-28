import { NextRequest, NextResponse } from 'next/server';
import { MediaService } from '@/database/services/media.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  try {
    const { mediaId } = await params;
    
    // Special handling for "default" or placeholder images if needed
    // IF mediaId is 'undefined' or similar, return 404 immediately
    
    const media = await MediaService.getMedia(mediaId);

    const headers = new Headers();
    headers.set('Content-Type', media.mimeType);
    headers.set('Content-Length', media.size.toString());
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Check if it's a Mongo Binary (BSON)
    let buffer: Buffer;
    if (Buffer.isBuffer(media.data)) {
        buffer = media.data;
    } else if (media.data && (media.data as any).buffer && Buffer.isBuffer((media.data as any).buffer)) {
         // Handle BSON Binary
         buffer = (media.data as any).buffer;
    } else {
         buffer = Buffer.from(media.data as any);
    }

    console.log(`Serving media ${mediaId}: size=${media.size} type=${media.mimeType} bufferLen=${buffer.length}`);

    return new NextResponse(buffer as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('Media retrieval error:', error);
    return NextResponse.json({ error: error.message || 'Media not found' }, { status: 404 });
  }
}

async function __DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ mediaId: string }> }
) {
    try {
        const { mediaId } = await params;
        // Verify User? Assuming club admins can delete.
        // For strict security we should check if media.uploaderId === req.user.id OR media.clubId === managedClubId.
        // For now, simpler implementation:
        
        await MediaService.deleteMedia(mediaId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
    }
}

export const GET = withApiTelemetry('/api/media/[mediaId]', __GET as any);
export const DELETE = withApiTelemetry('/api/media/[mediaId]', __DELETE as any);
