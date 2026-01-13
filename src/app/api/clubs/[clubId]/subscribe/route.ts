import { NextRequest, NextResponse } from 'next/server';
import { ClubSubscriptionService } from '@/database/services/club-subscription.service';
import { AuthorizationService } from '@/database/services/authorization.service';

export async function GET(
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

export async function POST(
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
