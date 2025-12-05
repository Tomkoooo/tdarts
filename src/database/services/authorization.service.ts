import { UserModel } from "../models/user.model";
import { connectMongo } from "@/lib/mongoose";
import { AuthService } from "./auth.service";
import { NextRequest } from "next/server";

export class AuthorizationService {
  static async isGlobalAdmin(userId: string): Promise<boolean> {
    await connectMongo();
    const user = await UserModel.findById(userId).select('isAdmin');
    return user?.isAdmin === true;
  }

  static async checkRole(userId: string, expectedRole: string, clubId: string): Promise<boolean> {
    await connectMongo();
    
    // Check if user is super admin (isAdmin: true)
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin) {
      return true; // Super admin has access to everything
    }
    
    // Check club-specific role directly without recursion
    const userObjectId = new (await import('mongoose')).Types.ObjectId(userId);
    
    const result = await (await import('../models/club.model')).ClubModel.aggregate([
      { $match: { _id: new (await import('mongoose')).Types.ObjectId(clubId) } },
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

    if (result.length === 0) {
      return false;
    }

    return result[0].userRole === expectedRole;
  }

  static async checkAdminOrModerator(userId: string, clubId: string): Promise<boolean> {
    await connectMongo();
    
    // Check if user is global admin (isAdmin: true)
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin === true) {
      console.log('checkAdminOrModerator - Global admin detected:', userId);
      return true;
    }
    
    // Check club-specific role directly without recursion
    const userObjectId = new (await import('mongoose')).Types.ObjectId(userId);
    
    const result = await (await import('../models/club.model')).ClubModel.aggregate([
      { $match: { _id: new (await import('mongoose')).Types.ObjectId(clubId) } },
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

    if (result.length === 0) {
      return false;
    }

    const roleInClub = result[0].userRole;
    const hasPermission = roleInClub === 'admin' || roleInClub === 'moderator';
    console.log('checkAdminOrModerator - Club role:', roleInClub, 'hasPermission:', hasPermission, 'for user:', userId);
    return hasPermission;
  }

  /**
   * Get user ID from NextRequest (from JWT token in cookies)
   */
  static async getUserIdFromRequest(request: NextRequest): Promise<string | null> {
    try {
      const token = request.headers.get('authorization')?.split('Bearer ')[1];
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

  /**
   * Check if user has moderation permissions (admin or moderator) for a club
   */
  static async hasClubModerationPermission(userId: string, clubId: string): Promise<boolean> {
    return await this.checkAdminOrModerator(userId, clubId);
  }

  static async checkAdminOnly(userId: string, clubId: string): Promise<boolean> {
    await connectMongo();
    
    // Check if user is global admin (isAdmin: true)
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin === true) {
      console.log('checkAdminOnly - Global admin detected:', userId);
      return true;
    }
    
    // Check club-specific admin role
    const userObjectId = new (await import('mongoose')).Types.ObjectId(userId);
    
    const result = await (await import('../models/club.model')).ClubModel.aggregate([
      { $match: { _id: new (await import('mongoose')).Types.ObjectId(clubId) } },
      {
        $project: {
          userRole: {
            $cond: {
              if: { $in: [userObjectId, '$admin'] },
              then: 'admin',
              else: 'none'
            }
          }
        }
      }
    ]);

    if (result.length === 0) {
      return false;
    }

    const isClubAdmin = result[0].userRole === 'admin';
    console.log('checkAdminOnly - Club admin status:', isClubAdmin, 'for user:', userId, 'in club:', clubId);
    return isClubAdmin;
  }

  static async checkMemberOrHigher(userId: string, clubId: string): Promise<boolean> {
    await connectMongo();
    
    // Check if user is super admin
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin) {
      return true;
    }
    
    // Check club-specific role directly without recursion
    const userObjectId = new (await import('mongoose')).Types.ObjectId(userId);
    
    const result = await (await import('../models/club.model')).ClubModel.aggregate([
      { $match: { _id: new (await import('mongoose')).Types.ObjectId(clubId) } },
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

    if (result.length === 0) {
      return false;
    }

    const roleInClub = result[0].userRole;
    return roleInClub === 'admin' || roleInClub === 'moderator' || roleInClub === 'member';
  }
}