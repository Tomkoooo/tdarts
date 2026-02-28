
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { PostModel } from "@/database/models/post.model";
import { Types } from "mongoose";
import { withApiTelemetry } from '@/lib/api-telemetry';

async function __GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; postId: string }> }
) {
  try {
    await connectMongo();
    const { clubId, postId } = await params;

    if (!Types.ObjectId.isValid(clubId) || !Types.ObjectId.isValid(postId)) {
        return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const post = await PostModel.findOne({ 
        _id: new Types.ObjectId(postId),
        clubId: new Types.ObjectId(clubId)
    }).populate('authorId', 'name username');

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function __PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; postId: string }> }
) {
  try {
    const { clubId, postId } = await params;
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const post = await PostService.updatePost(postId, body);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json(post);
  } catch (error: any) {
    console.error("Error updating post:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

async function __DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string; postId: string }> }
) {
  try {
    const { clubId, postId } = await params;
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAuthorized = await AuthorizationService.checkAdminOrModerator(userId, clubId);
    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await PostService.deletePost(postId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// Add necessary imports
import { AuthorizationService } from "@/database/services/authorization.service";
import { PostService } from "@/database/services/post.service";

export const GET = withApiTelemetry('/api/clubs/[clubId]/posts/[postId]', __GET as any);
export const PUT = withApiTelemetry('/api/clubs/[clubId]/posts/[postId]', __PUT as any);
export const DELETE = withApiTelemetry('/api/clubs/[clubId]/posts/[postId]', __DELETE as any);
