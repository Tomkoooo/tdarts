import mongoose from "mongoose";
import { UserModel } from "../models/user.model";
import { ClubModel } from "../models/club.model";
import { connectMongo } from "@/lib/mongoose";
import { AuthService } from "./auth.service";
import { NextRequest } from "next/server";

type ClubRole = 'admin' | 'moderator' | 'member' | 'none';

const ROLE_CACHE_TTL_MS = 10_000;

const roleCache = new Map<string, { role: ClubRole; expiresAt: number }>();

function getCachedRole(userId: string, clubId: string): ClubRole | null {
  const key = `${userId}:${clubId}`;
  const entry = roleCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    roleCache.delete(key);
    return null;
  }
  return entry.role;
}

function setCachedRole(userId: string, clubId: string, role: ClubRole) {
  const key = `${userId}:${clubId}`;
  roleCache.set(key, { role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });

  if (roleCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of roleCache) {
      if (now > v.expiresAt) roleCache.delete(k);
    }
  }
}

async function resolveClubRole(userId: string, clubId: string): Promise<ClubRole> {
  const cached = getCachedRole(userId, clubId);
  if (cached !== null) return cached;

  await connectMongo();

  const user = await UserModel.findById(userId).select('isAdmin').lean();
  if ((user as any)?.isAdmin === true) {
    setCachedRole(userId, clubId, 'admin');
    return 'admin';
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  const result = await ClubModel.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(clubId) } },
    {
      $project: {
        userRole: {
          $cond: {
            if: { $in: [userObjectId, '$admin'] },
            then: 'admin',
            else: {
              $cond: {
                if: { $in: [userObjectId, '$moderators'] },
                then: 'moderator',
                else: {
                  $cond: {
                    if: { $in: [userObjectId, '$members'] },
                    then: 'member',
                    else: 'none'
                  }
                }
              }
            }
          }
        }
      }
    }
  ]);

  const role: ClubRole = result.length > 0 ? result[0].userRole : 'none';
  setCachedRole(userId, clubId, role);
  return role;
}

export class AuthorizationService {
  static async isGlobalAdmin(userId: string): Promise<boolean> {
    await connectMongo();
    const user = await UserModel.findById(userId).select('isAdmin');
    return user?.isAdmin === true;
  }

  static async checkRole(userId: string, expectedRole: string, clubId: string): Promise<boolean> {
    const role = await resolveClubRole(userId, clubId);
    return role === expectedRole;
  }

  static async checkAdminOrModerator(userId: string, clubId: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'production' && process.env.LOAD_TEST_MODE === 'true') {
      console.error('CRITICAL: LOAD_TEST_MODE cannot be enabled in production environment');
      return false;
    }

    if (
      process.env.LOAD_TEST_MODE === 'true' &&
      userId === process.env.LOAD_TEST_USER_ID &&
      (!process.env.LOAD_TEST_CLUB_ID || clubId === process.env.LOAD_TEST_CLUB_ID)
    ) {
      return true;
    }

    const role = await resolveClubRole(userId, clubId);
    return role === 'admin' || role === 'moderator';
  }

  static async getUserIdFromRequest(request: NextRequest): Promise<string | null> {
    try {
      let token = request.headers.get('authorization')?.split('Bearer ')[1];
      if (!token) {
        token = request.cookies.get('token')?.value;
      }

      if (!token) {
        return null;
      }

      const user = await AuthService.verifyToken(token);
      return user._id.toString();
    } catch (error) {
      console.error('Error getting user ID from request:', error);
      return null;
    }
  }

  static async hasClubModerationPermission(userId: string, clubId: string): Promise<boolean> {
    return await this.checkAdminOrModerator(userId, clubId);
  }

  static async checkAdminOnly(userId: string, clubId: string): Promise<boolean> {
    const role = await resolveClubRole(userId, clubId);
    return role === 'admin';
  }

  static async checkMemberOrHigher(userId: string, clubId: string): Promise<boolean> {
    const role = await resolveClubRole(userId, clubId);
    return role === 'admin' || role === 'moderator' || role === 'member';
  }
}
