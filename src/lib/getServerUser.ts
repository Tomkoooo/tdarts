import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { cache } from "react";
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

type SessionUserShape = {
  _id: unknown;
  username?: string;
  name?: string;
  email?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  profilePicture?: string | null;
};

function normalizeSessionUser(user: unknown): SessionUserShape | null {
  if (!user || typeof user !== "object") return null;
  const candidate = user as SessionUserShape;
  if (!candidate._id) return null;
  return candidate;
}

/**
 * Get the current user from server (JWT cookie or NextAuth session).
 * Used for server-side redirects and auth checks in Server Components.
 */
const resolveServerUser = cache(async (): Promise<ServerUser | undefined> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const hasSessionCookie = Boolean(
    cookieStore.get("next-auth.session-token")?.value ||
      cookieStore.get("__Secure-next-auth.session-token")?.value ||
      cookieStore.get("authjs.session-token")?.value ||
      cookieStore.get("__Secure-authjs.session-token")?.value
  );

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

  if (!hasSessionCookie) {
    return undefined;
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.email) {
    try {
      const userResult = await findSessionUserByEmail(session.user.email);
      const user = normalizeSessionUser(Array.isArray(userResult) ? userResult[0] : userResult);
      if (user) {
        return {
          _id: String(user._id),
          username: user.username || "",
          name: user.name || "",
          email: user.email || "",
          isVerified: Boolean(user.isVerified),
          isAdmin: Boolean(user.isAdmin),
          profilePicture: user.profilePicture || undefined,
        };
      }
    } catch {
      // Ignore
    }
  }

  return undefined;
});

export async function getServerUser(): Promise<ServerUser | undefined> {
  return resolveServerUser();
}
