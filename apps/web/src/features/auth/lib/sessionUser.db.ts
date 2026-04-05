import { UserModel } from '@/database/models/user.model';

const SESSION_USER_SELECT = '_id username name email isVerified isAdmin profilePicture country locale';

export async function findSessionUserByEmail(email?: string | null) {
  if (!email) return null;
  return UserModel.findOne({ email }).select(SESSION_USER_SELECT).lean();
}

export async function findSessionUserById(userId?: string | null) {
  if (!userId) return null;
  return UserModel.findById(userId).select(SESSION_USER_SELECT).lean();
}
