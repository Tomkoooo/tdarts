import { UserModel } from "../models/user.model";
import { connectMongo } from "@/lib/mongoose";

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