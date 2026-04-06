import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';
import { UserDocument as IUserDocument } from '@/interface/user.interface';
import { BadRequestError, ValidationError } from '@/middleware/errorHandle';
import { connectMongo } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';
import { MediaService } from '@/database/services/media.service';

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
}