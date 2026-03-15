import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { AuthService } from "@/database/services/auth.service";
import { findSessionUserByEmail } from "@/features/auth/lib/sessionUser.db";
import { authOptions } from "@/lib/auth";

export type ServerUser = {
  _id: string;
  username: string;
  name: string;
  email: string;
  isVerified: boolean;
  isAdmin: boolean;
  profilePicture?: string;
};

/**
 * Get the current user from server (JWT cookie or NextAuth session).
 * Used for server-side redirects and auth checks in Server Components.
 */
export async function getServerUser(): Promise<ServerUser | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (token) {
    try {
      const user = await AuthService.verifyToken(token);
      return {
        _id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        profilePicture: user.profilePicture,
      };
    } catch {
      // Invalid token - fall through to session check
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    try {
      const user = await findSessionUserByEmail(session.user.email);
      if (user) {
        return {
          _id: user._id.toString(),
          username: user.username,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
          isAdmin: user.isAdmin,
          profilePicture: user.profilePicture,
        };
      }
    } catch {
      // Ignore
    }
  }

  return undefined;
}
