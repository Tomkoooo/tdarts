import { PlayerModel } from '../models/player.model';

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
} 