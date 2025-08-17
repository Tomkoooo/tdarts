import { ClubService } from "./club.service";
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
    
    // Check club-specific role
    const roleInClub = await ClubService.getUserRoleInClub(userId, clubId);
    return roleInClub === expectedRole;
  }

  static async checkAdminOrModerator(userId: string, clubId: string): Promise<boolean> {
    await connectMongo();
    
    // Check if user is super admin
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin) {
      return true;
    }
    
    // Check club-specific role
    const roleInClub = await ClubService.getUserRoleInClub(userId, clubId);
    return roleInClub === 'admin' || roleInClub === 'moderator';
  }

  static async checkAdminOnly(userId: string, clubId: string): Promise<boolean> {
    await connectMongo();
    
    // Check if user is super admin
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin) {
      return true;
    }
    
    // Check club-specific role
    const roleInClub = await ClubService.getUserRoleInClub(userId, clubId);
    return roleInClub === 'admin';
  }

  static async checkMemberOrHigher(userId: string, clubId: string): Promise<boolean> {
    await connectMongo();
    
    // Check if user is super admin
    const user = await UserModel.findById(userId).select('isAdmin');
    if (user?.isAdmin) {
      return true;
    }
    
    // Check club-specific role
    const roleInClub = await ClubService.getUserRoleInClub(userId, clubId);
    return roleInClub === 'admin' || roleInClub === 'moderator' || roleInClub === 'member';
  }
}