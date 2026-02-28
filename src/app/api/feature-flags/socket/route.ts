import { NextRequest, NextResponse } from 'next/server';
import { FeatureFlagService } from '@/lib/featureFlags';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clubId = searchParams.get('clubId');

    const enabled = await FeatureFlagService.isSocketEnabled(clubId || undefined);
    
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Error checking socket feature:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/feature-flags/socket', __GET as any);
