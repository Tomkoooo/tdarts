import { NextRequest, NextResponse } from 'next/server';
import { FeatureFlagService } from '@/lib/featureFlags';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');
    const clubId = searchParams.get('clubId');

    if (!feature) {
      return NextResponse.json({ error: 'Feature name is required' }, { status: 400 });
    }

    const enabled = await FeatureFlagService.isFeatureEnabled(feature, clubId || undefined);
    
    return NextResponse.json({ enabled });
  } catch (error) {
    console.error('Error checking feature flag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 