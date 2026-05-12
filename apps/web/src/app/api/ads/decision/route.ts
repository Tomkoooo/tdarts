import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { InternalAdDecisionEngineService } from '@tdarts/services';
import { getServerUser } from '@/lib/getServerUser';
import { getOrCreateAdSessionId } from '@/features/ads/lib/identity';
import { withRouteTelemetry } from '@/shared/lib/withTelemetry';
import { FeatureFlagService } from '@/features/flags/lib/featureFlags';

const engine = new InternalAdDecisionEngineService();

async function handler(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const user = await getServerUser();
  const sessionId = await getOrCreateAdSessionId();
  const adsEnabled = await FeatureFlagService.isFeatureEnabled('ADS');
  if (!adsEnabled) {
    return NextResponse.json({
      decisionId: crypto.randomUUID(),
      ad: null,
      reasonCode: 'feature_disabled',
      latencyMs: 0,
      renderMode: 'live',
    });
  }
  const placeholderEnabled = await FeatureFlagService.isFeatureEnabled('ADS_PLACEHOLDER');
  const audienceRoles = ['visitor'];
  if (user?._id) audienceRoles.push('player');
  if (user?.isAdmin) audienceRoles.push('organizer');

  if (placeholderEnabled) {
    return NextResponse.json({
      decisionId: crypto.randomUUID(),
      ad: {
        campaignId: 'placeholder',
        creativeId: `placeholder-${String(body?.slotId || 'default')}`,
        destinationUrl: '#',
        viewType: body?.viewType || 'block',
        title: 'Ad placement placeholder',
        bodyText: 'Placeholder mode is enabled for placement review.',
        accessibility: { altText: 'Ad placeholder block' },
        isPlaceholder: true,
      },
      reasonCode: 'placeholder_mode',
      latencyMs: 0,
      renderMode: 'placeholder',
    });
  }

  const result = await engine.decide({
    slotContext: {
      slotId: String(body?.slotId || 'default'),
      placementKey: String(body?.placementKey || 'default'),
      viewType: body?.viewType || 'block',
      pageKey: String(body?.pageKey || '/'),
      device: body?.device || 'desktop',
    },
    identity: {
      userId: user?._id ? String(user._id) : undefined,
      sessionId,
      audienceRoles,
    },
    requestId: request.headers.get('x-request-id') || undefined,
  });

  return NextResponse.json({ ...result, renderMode: 'live' });
}

export const POST = withRouteTelemetry('api/ads/decision', handler);
