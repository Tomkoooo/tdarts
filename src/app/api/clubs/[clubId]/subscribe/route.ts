import { NextRequest, NextResponse } from 'next/server';
import { ClubSubscriptionService } from '@/database/services/club-subscription.service';
import { AuthorizationService } from '@/database/services/authorization.service';
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ subscribed: false });
    }

    const subscribed = await ClubSubscriptionService.isSubscribed(userId, clubId);
    return NextResponse.json({ subscribed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function __POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await ClubSubscriptionService.toggleSubscription(userId, clubId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const GET = withApiTelemetry('/api/clubs/[clubId]/subscribe', __GET as any);
export const POST = withApiTelemetry('/api/clubs/[clubId]/subscribe', __POST as any);
