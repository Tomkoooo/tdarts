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

  await AdTelemetryService.recordImpression({
    campaignId: body?.ad?.campaignId || undefined,
    creativeId: body?.ad?.creativeId || undefined,
    slotId: String(body?.slotId || 'default'),
    placementKey: String(body?.placementKey || 'default'),
    actorType,
    actorIdHash: hashActorId(actorRaw),
    sessionId,
    served: Boolean(body?.ad),
    noFillReason: body?.ad ? undefined : 'decision_no_fill',
    decisionLatencyMs: Number(body?.decisionLatencyMs || 0),
    impressionAt: new Date(),
    decisionId: String(body?.decisionId || ''),
  });

  return NextResponse.json({ ok: true });
}

export const POST = withRouteTelemetry('api/ads/impression', handler);
