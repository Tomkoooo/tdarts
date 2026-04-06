import { UserModel } from '@tdarts/core';
import { PlayerModel } from '@tdarts/core';
import { UserDocument as IUserDocument } from '@tdarts/core';
import { BadRequestError, ValidationError } from '@tdarts/core';
import { connectMongo } from '@tdarts/core';
import { AuthService } from './auth.service';
import { MediaService } from './media.service';

export class ProfileService {
  static async updateProfile(
    userId: string,
    updates: {
      email?: string;
      name?: string;
      username?: string;
      password?: string;
      profilePicture?: string | null;
      publicConsent?: boolean;
      country?: string | null;
      locale?: 'hu' | 'en' | 'de';
    }
  ): Promise<IUserDocument> {
    await connectMongo();
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found', 'user', {
        userId
      });
    }

    // Ellenőrizzük, hogy az új email vagy felhasználónév már létezik-e
    if (updates.email || updates.username) {
      const existingUser = await UserModel.findOne({
        $or: [
          updates.email ? { email: updates.email } : {},
          updates.username ? { username: updates.username } : {},
        ],
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new ValidationError('Email or username already exists', 'user', {
          userId,
          email: updates.email,
          username: updates.username
        });
      }
    }

    // Frissítjük a felhasználó adatait
    if (updates.email) {
      user.email = updates.email;
      user.isVerified = false; // Új email esetén verifikáció szükséges
      await AuthService.sendVerificationEmail(user); // AuthService kezeli az email küldést
    }
    if (updates.name) user.name = updates.name;
    if (updates.username) user.username = updates.username;
    if (updates.country !== undefined) user.country = updates.country || null;
    if (updates.locale) user.locale = updates.locale;
    if (updates.password) {
      user.password = updates.password; // A UserModel feltételezi, hogy a jelszó hash-elése a save() metódusban történik
    }
    
    // Handle Profile Picture and Media Cleanup
    if (updates.profilePicture !== undefined) {
      const oldPictureUrl = user.profilePicture;
      const newPictureUrl = updates.profilePicture;

      // Only clean up if the picture actually changed
      if (oldPictureUrl !== newPictureUrl) {
        user.profilePicture = newPictureUrl;

        // If there was an old picture, decrement its usage
        if (oldPictureUrl && oldPictureUrl.startsWith('/api/media/')) {
          const mediaId = oldPictureUrl.split('/').pop();
          if (mediaId) {
            try {
              await MediaService.deleteMedia(mediaId);
              console.log(`Decremented usage for media: ${mediaId}`);
            } catch (err) {
              console.error(`Failed to cleanup old media ${mediaId}:`, err);
            }
          }
        }
      }
    }

    await user.save();

    // Ha a név vagy kép változott, frissítsük a kapcsolt player dokumentumot is
    if (
      updates.name ||
      updates.profilePicture !== undefined ||
      updates.publicConsent !== undefined ||
      updates.country !== undefined
    ) {
      try {
        const linkedPlayer = await PlayerModel.findOne({ userRef: userId });
        if (linkedPlayer) {
          const playerUpdates: any = {};
          if (updates.name) playerUpdates.name = updates.name;
          if (updates.profilePicture !== undefined) playerUpdates.profilePicture = updates.profilePicture;
          if (updates.publicConsent !== undefined) playerUpdates.publicConsent = updates.publicConsent;
          if (updates.country !== undefined) playerUpdates.country = updates.country || null;
          
          await PlayerModel.findByIdAndUpdate(
            linkedPlayer._id,
            playerUpdates,
            { new: true }
          );
          console.log(`Updated player data for user ${userId}`);
        }
      } catch (error) {
        console.error('Error updating linked player data:', error);
        // Don't throw error to prevent user update from failing
      }
    }

    return user;
  }

  static async verifyEmail(userId: string, code: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found', 'user', {
        userId
      });
    }
    await user.verifyEmail(code);
  }

  static async logout(userId: string): Promise<void> {
    await connectMongo();
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BadRequestError('User not found', 'user', {
        userId
      });
    }
    // Itt lehetne további műveleteket végezni, pl. token érvénytelenítése
  }

  /**
   * Store profile image via MediaService and set user.profilePicture to /api/media/{id}
   * (or absolute URL when API_PUBLIC_URL or NEXT_PUBLIC_APP_URL is set — needed for mobile API host).
   */
  static async uploadProfileImageFromBuffer(
    userId: string,
    file: Buffer,
    mimeType: string,
    filename: string,
    size: number
  ): Promise<{ url: string; mediaId: string }> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(mimeType)) {
      throw new BadRequestError('Unsupported image type', 'user', {
        mimeType,
        errorCode: 'MEDIA_UNSUPPORTED_TYPE',
        expected: true,
        operation: 'profile.uploadProfileImageFromBuffer',
      });
    }
    const maxBytes = 5 * 1024 * 1024;
    if (size <= 0 || size > maxBytes) {
      throw new BadRequestError('Invalid file size', 'user', {
        errorCode: 'MEDIA_INVALID_SIZE',
        expected: true,
        operation: 'profile.uploadProfileImageFromBuffer',
      });
    }
    const media = await MediaService.createMedia(userId, file, mimeType, filename || 'upload', size);
    const mediaId = String(media._id);
    const publicBase = (process.env.API_PUBLIC_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '')
      .trim()
      .replace(/\/$/, '');
    const path = `/api/media/${mediaId}`;
    const url = publicBase ? `${publicBase}${path}` : path;
    await this.updateProfile(userId, { profilePicture: url });
    return { url, mediaId };
  }
}