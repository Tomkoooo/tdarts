import { UserModel } from '../models/user.model';

export class UserService {
  static async searchUsers(query: string) {
    if (!query || query.length < 2) return [];
    const users = await UserModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    }).limit(10);
    
    // Transform users to include userRef for consistency with player system
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      userRef: user._id // Add userRef for consistency
    }));
  }
} 