import { NextRequest, NextResponse } from 'next/server';
import { AdTelemetryService } from '@tdarts/services';
import { getServerUser } from '@/lib/getServerUser';
import { getOrCreateAdSessionId, hashActorId } from '@/features/ads/lib/identity';
import { withRouteTelemetry } from '@/shared/lib/withTelemetry';

async function handler(request: NextRequest) {
  const user = await getServerUser();
  const sessionId = await getOrCreateAdSessionId();
  const actorType = user?._id ? 'user' : 'session';
  const actorRaw = user?._id ? String(user._id) : sessionId;

  const campaignId = request.nextUrl.searchParams.get('campaignId') || '';
  const creativeId = request.nextUrl.searchParams.get('creativeId') || '';
  const url = request.nextUrl.searchParams.get('url') || '/';

  await AdTelemetryService.recordInteraction({
    campaignId,
    creativeId,
    eventType: 'click',
    actorType,
    actorIdHash: hashActorId(actorRaw),
    sessionId,
    pagePath: request.nextUrl.searchParams.get('from') || '/',
    eventAt: new Date(),
  });

  return NextResponse.redirect(url);
}

export const GET = withRouteTelemetry('api/ads/click', handler);
