import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { cache } from "react";
import { AuthService } from '@tdarts/services';
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
  country?: string | null;
  locale?: 'hu' | 'en' | 'de';
  termsAcceptedAt?: string | null;
  needsProfileCompletion?: boolean;
};

function parseTermsAcceptedAt(raw: unknown): Date | null {
  if (raw == null) return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === 'string' || typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function completionFlags(country: string | null | undefined, termsRaw: unknown) {
  const termsAcceptedAt = parseTermsAcceptedAt(termsRaw);
  return {
    termsAcceptedAt: termsAcceptedAt ? termsAcceptedAt.toISOString() : null,
    needsProfileCompletion: AuthService.needsProfileCompletion({
      termsAcceptedAt,
      country: country ?? null,
    }),
  };
}

type SessionUserShape = {
  _id: unknown;
  username?: string;
  name?: string;
  email?: string;
  isVerified?: boolean;
  isAdmin?: boolean;
  profilePicture?: string | null;
  country?: string | null;
  locale?: 'hu' | 'en' | 'de';
  termsAcceptedAt?: unknown;
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
      const { termsAcceptedAt, needsProfileCompletion } = completionFlags(
        (user as { country?: string | null }).country,
        (user as { termsAcceptedAt?: unknown }).termsAcceptedAt
      );
      return {
        _id: user._id.toString(),
        username: user.username,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        profilePicture: user.profilePicture,
        country: (user as any).country ?? null,
        locale: (user as any).locale || 'hu',
        termsAcceptedAt,
        needsProfileCompletion,
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
        const { termsAcceptedAt, needsProfileCompletion } = completionFlags(
          user.country,
          user.termsAcceptedAt
        );
        return {
          _id: String(user._id),
          username: user.username || "",
          name: user.name || "",
          email: user.email || "",
          isVerified: Boolean(user.isVerified),
          isAdmin: Boolean(user.isAdmin),
          profilePicture: user.profilePicture || undefined,
          country: user.country ?? null,
          locale: user.locale || 'hu',
          termsAcceptedAt,
          needsProfileCompletion,
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
