import { UserModel } from '@/database/models/user.model';

export async function findSessionUserByEmail(email?: string | null) {
  if (!email) return null;
  return UserModel.findOne({ email });
}

export async function findSessionUserById(userId?: string | null) {
  if (!userId) return null;
  return UserModel.findById(userId);
}
