import { connectMongo } from '@/lib/mongoose';
import { GalleryModel } from '@/database/models/gallery.model';
import { BadRequestError } from '@/middleware/errorHandle';
import { Types } from 'mongoose';
import type { GalleryDocument } from '@/database/models/gallery.model';

export class GalleryService {
  static async getClubGalleries(clubId: string): Promise<GalleryDocument[]> {
    await connectMongo();
    if (!Types.ObjectId.isValid(clubId)) {
      throw new BadRequestError('Invalid club ID');
    }
    return GalleryModel.find({ clubId: new Types.ObjectId(clubId) }).sort({ createdAt: -1 });
  }

  static async createGallery(
    clubId: string,
    data: { name: string; images?: string[] }
  ): Promise<GalleryDocument> {
    await connectMongo();
    if (!Types.ObjectId.isValid(clubId)) {
      throw new BadRequestError('Invalid club ID');
    }
    const gallery = await GalleryModel.create({
      clubId: new Types.ObjectId(clubId),
      name: data.name,
      images: data.images || [],
    });
    return gallery;
  }

  static async updateGallery(
    galleryId: string,
    clubId: string,
    data: { name?: string; images?: string[] }
  ): Promise<GalleryDocument | null> {
    await connectMongo();
    if (!Types.ObjectId.isValid(galleryId) || !Types.ObjectId.isValid(clubId)) {
      throw new BadRequestError('Invalid ID');
    }
    const gallery = await GalleryModel.findOneAndUpdate(
      { _id: new Types.ObjectId(galleryId), clubId: new Types.ObjectId(clubId) },
      { $set: data },
      { new: true }
    );
    return gallery;
  }

  static async deleteGallery(galleryId: string, clubId: string): Promise<void> {
    await connectMongo();
    if (!Types.ObjectId.isValid(galleryId) || !Types.ObjectId.isValid(clubId)) {
      throw new BadRequestError('Invalid ID');
    }
    await GalleryModel.findOneAndDelete({
      _id: new Types.ObjectId(galleryId),
      clubId: new Types.ObjectId(clubId),
    });
  }
}
