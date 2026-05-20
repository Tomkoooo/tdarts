import { NextRequest, NextResponse } from 'next/server';
import { AdTelemetryService } from '@tdarts/services';
import { getServerUser } from '@/lib/getServerUser';
import { getOrCreateAdSessionId, hashActorId } from '@/features/ads/lib/identity';
import { withRouteTelemetry } from '@/shared/lib/withTelemetry';

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const user = await getServerUser();
  const sessionId = await getOrCreateAdSessionId();
  const actorType = user?._id ? 'user' : 'session';
  const actorRaw = user?._id ? String(user._id) : sessionId;

  await AdTelemetryService.recordInteraction({
    campaignId: String(body?.campaignId || ''),
    creativeId: String(body?.creativeId || ''),
    eventType: body?.eventType || 'hover',
    actorType,
    actorIdHash: hashActorId(actorRaw),
    sessionId,
    pagePath: String(body?.pagePath || '/'),
    eventAt: body?.eventAt ? new Date(String(body.eventAt)) : new Date(),
  });

  return NextResponse.json({ ok: true });
}

export const POST = withRouteTelemetry('api/ads/interaction', handler);
