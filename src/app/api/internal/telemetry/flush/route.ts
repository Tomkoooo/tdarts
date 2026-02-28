import { NextRequest, NextResponse } from 'next/server';
import { validateInternalSecret, unauthorizedResponse } from '@/lib/api-auth.middleware';
import { ApiTelemetryService } from '@/database/services/api-telemetry.service';

export async function POST(req: NextRequest) {
  if (!validateInternalSecret(req)) {
    return unauthorizedResponse();
  }

  try {
    const flushedBuckets = await ApiTelemetryService.flush();
    return NextResponse.json({ success: true, flushedBuckets });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to flush telemetry metrics',
      },
      { status: 500 }
    );
  }
}
