import { NextRequest, NextResponse } from 'next/server';
import { PostService } from '@/database/services/post.service';
import { AuthorizationService } from '@/database/services/authorization.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await PostService.getClubPosts(clubId, page, limit);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId } = await params;
    const body = await req.json();

    // Permission check
    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!isAuthorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // TODO: Paywall check (canCreatePost)

    const post = await PostService.createPost(clubId, userId, body);
    
    // Notify subscribers
    const { NotificationService } = await import("@/database/services/notification.service");
    NotificationService.notifySubscribers(clubId, 'post', { title: body.title, id: (post as any)._id.toString() });

    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
