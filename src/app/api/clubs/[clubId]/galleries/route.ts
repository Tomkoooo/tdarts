
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { GalleryModel } from "@/database/models/gallery.model";
import { AuthorizationService } from "@/database/services/authorization.service";
import { Types } from "mongoose";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    await connectMongo();
    const { clubId } = await params;
    const galleries = await GalleryModel.find({ clubId }).sort({ createdAt: -1 });
    return NextResponse.json({ galleries });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const userId = await AuthorizationService.getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { clubId } = await params;
    const body = await req.json();
    const { name, images } = body;

    if (!name ) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (images && images.length > 5) {
        return NextResponse.json({ error: "Max 5 images allowed" }, { status: 400 });
    }

    await connectMongo();

    // Limit check
    const { FeatureFlagService } = await import("@/database/services/feature-flag.service");
    const canCreate = await FeatureFlagService.canCreateGallery(clubId);
    if (!canCreate) {
        return NextResponse.json({ error: "Maximum 3 galéria engedélyezett" }, { status: 400 });
    }

    const gallery = await GalleryModel.create({
        clubId: new Types.ObjectId(clubId),
        name,
        images: images || []
    });

    // Notify subscribers
    const { NotificationService } = await import("@/database/services/notification.service");
    NotificationService.notifySubscribers(clubId, 'gallery', { title: name, id: (gallery as any)._id.toString() });

    return NextResponse.json(gallery, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
    try {
        const userId = await AuthorizationService.getUserIdFromRequest(req);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { clubId } = await params;
        const body = await req.json();
        const { id, name, images } = body;

        if (!id) return NextResponse.json({ error: "Gallery ID required" }, { status: 400 });
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        if (images && images.length > 5) {
            return NextResponse.json({ error: "Max 5 images allowed" }, { status: 400 });
        }

        await connectMongo();
        
        const gallery = await GalleryModel.findOne({ _id: new Types.ObjectId(id), clubId: new Types.ObjectId(clubId) });
        if (!gallery) return NextResponse.json({ error: "Gallery not found" }, { status: 404 });

        gallery.name = name;
        gallery.images = images || [];
        await gallery.save();

        return NextResponse.json(gallery);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest, 
    { params }: { params: Promise<{ clubId: string }> }
) {
    try {
        const userId = await AuthorizationService.getUserIdFromRequest(req);
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        const { clubId } = await params;
        const { searchParams } = new URL(req.url);
        const galleryId = searchParams.get('id');

        if (!galleryId) return NextResponse.json({ error: "Gallery ID required" }, { status: 400 });

        await connectMongo();
        await GalleryModel.deleteOne({ _id: new Types.ObjectId(galleryId), clubId: new Types.ObjectId(clubId) });
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
