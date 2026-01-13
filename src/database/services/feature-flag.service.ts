import { connectMongo } from '@/lib/mongoose';
import { GalleryModel } from '../models/gallery.model';

export class FeatureFlagService {
  /**
   * Check if a club can create another gallery
   * @param clubId Club ID to check
   * @returns boolean true if limit not yet reached
   */
  static async canCreateGallery(clubId: string): Promise<boolean> {
    await connectMongo();
    const count = await GalleryModel.countDocuments({ clubId });
    // Temporary hard limit of 3 common for all clubs until subscription levels are defined
    return count < 3;
  }
}
