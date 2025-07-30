import mongoose from 'mongoose';
import { PlayerModel } from '../models/player.model';
import { UserService } from './user.service';
import { UserModel } from '../models/user.model';

export class PlayerService {
  static async searchPlayers(query: string) {
    if (!query || query.length < 2) return [];
    return PlayerModel.find({ name: { $regex: query, $options: 'i' } }).limit(10);
  }

  static async createPlayer(data: { userRef?: string; name: string }) {
    // Ha userRef van, nézzük van-e már ilyen player
    if (data.userRef) {
      let player = await PlayerModel.findOne({ userRef: data.userRef });
      if (player) return player;
      player = new PlayerModel({ userRef: data.userRef, name: data.name });
      await player.save();
      return player;
    }
    // Guest player: név alapján duplikációt elkerülni
    let player = await PlayerModel.findOne({ name: data.name, userRef: { $exists: false } });
    if (player) return player;
    player = new PlayerModel({ name: data.name });
    await player.save();
    return player;
  }

  /**
   * Keres vagy létrehoz egy játékost név alapján (csak guest/név alapú játékosokhoz)
   */
  static async findOrCreatePlayerByName(name: string) {
    let player = await PlayerModel.findOne({ name, userRef: { $exists: false } });
    if (player) return player;
    player = new PlayerModel({ name });
    await player.save();
    return player;
  }

  static async findPlayerByUserId(
    userId: string
  ): Promise<import('@/interface/player.interface').PlayerDocument | null> {
    if (!userId || typeof userId !== 'string') {
      return null;
    }

    // Try to match both as string and as ObjectId
    let player = await PlayerModel.findOne({ userRef: userId });
    if (!player) {
      const user = await UserModel.findById(userId);
      if (!user) {
        return null;
      }
      player = await PlayerModel.create({ userRef: userId, name: user.name });
    }
    return player || null;
  }
} 