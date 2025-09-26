import { UserModel } from '@/database/models/user.model';
import { PlayerModel } from '@/database/models/player.model';
import { UserDocument as IUserDocument } from '@/interface/user.interface';
import { BadRequestError, ValidationError } from '@/middleware/errorHandle';
import { connectMongo } from '@/lib/mongoose';
import { AuthService } from '@/database/services/auth.service';

export class ProfileService {
  static async updateProfile(
    userId: string,
    updates: {
      email?: string;
      name?: string;
      username?: string;
      password?: string;
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
    if (updates.password) {
      user.password = updates.password; // A UserModel feltételezi, hogy a jelszó hash-elése a save() metódusban történik
    }

    await user.save();

    // Ha a név változott, frissítsük a kapcsolt player dokumentumot is
    if (updates.name) {
      try {
        const linkedPlayer = await PlayerModel.findOne({ userRef: userId });
        if (linkedPlayer) {
          await PlayerModel.findByIdAndUpdate(
            linkedPlayer._id,
            { name: updates.name },
            { new: true }
          );
          console.log(`Updated player name for user ${userId} to: ${updates.name}`);
        }
      } catch (error) {
        console.error('Error updating linked player name:', error);
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