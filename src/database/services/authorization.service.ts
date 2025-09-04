import { UserModel } from "../models/user.model";
import { connectMongo } from "@/lib/mongoose";
import { AuthService } from "./auth.service";
import { NextRequest } from "next/server";

export class AuthorizationService {
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
    return roleInClub === 'admin' || roleInClub === 'moderator';
  }

  /**
   * Get user ID from NextRequest (from JWT token in cookies)
   */
  static async getUserIdFromRequest(request: NextRequest): Promise<string | null> {
    try {
      const token = request.cookies.get('token')?.value;
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

    return result[0].userRole === 'admin';
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