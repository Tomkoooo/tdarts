import { MediaDocument, MediaModel } from '@/database/models/media.model';
import { connectMongo } from '@/lib/mongoose';
import { BadRequestError } from '@/middleware/errorHandle';
import { Types } from 'mongoose';
import crypto from 'crypto';

export class MediaService {
  static async createMedia(
    uploaderId: string,
    file: Buffer,
    mimeType: string,
    filename: string,
    size: number,
    clubId?: string
  ): Promise<MediaDocument> {
    await connectMongo();

    // Basic validation
    if (!file || size === 0) {
      throw new BadRequestError('File is empty');
    }

    // Optional: Check storage limits here based on clubId/uploaderId subscription
    
    // Calculate hash
    const hash = crypto.createHash('sha256').update(file).digest('hex');

    // Check for existing media with same hash
    const existingMedia = await MediaModel.findOne({ hash });
    if (existingMedia) {
        existingMedia.usageCount += 1;
        await existingMedia.save();
        return existingMedia;
    }

    const media = await MediaModel.create({
      uploaderId,
      data: file,
      mimeType,
      filename,
      size,
      hash,
      usageCount: 1,
      clubId: clubId ? new Types.ObjectId(clubId) : undefined,
    });

    return media;
  }

  static async getMedia(mediaId: string): Promise<MediaDocument> {
    await connectMongo();
    
    // Validate ObjectId
    if (!Types.ObjectId.isValid(mediaId)) {
        throw new BadRequestError('Invalid Media ID');
    }

    const media = await MediaModel.findById(mediaId);
    if (!media) {
      throw new Error('Media not found');
    }
    return media;
  }
  static async deleteMedia(mediaId: string): Promise<void> {
    await connectMongo();
    if (!Types.ObjectId.isValid(mediaId)) {
        throw new BadRequestError('Invalid Media ID');
    }
    
    const media = await MediaModel.findById(mediaId);
    if (!media) return;

    if (media.usageCount > 1) {
        media.usageCount -= 1;
        await media.save();
    } else {
        await MediaModel.deleteOne({ _id: mediaId });
    }
  }
}
