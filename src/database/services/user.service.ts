import { UserModel } from '../models/user.model';

export class UserService {
  static async searchUsers(query: string) {
    if (!query || query.length < 2) return [];
    return UserModel.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    }).limit(10);
  }
} 