import type { ServerUser } from "@/lib/getServerUser";
import type { SimplifiedUser } from "@/hooks/useUser";

export function toInitialUserContext(
  serverUser: ServerUser | undefined,
): SimplifiedUser | undefined {
  if (!serverUser?._id) return undefined;

  return {
    _id: serverUser._id,
    username: serverUser.username,
    name: serverUser.name,
    email: serverUser.email,
    isVerified: Boolean(serverUser.isVerified),
    isAdmin: Boolean(serverUser.isAdmin),
    profilePicture: serverUser.profilePicture,
    country: serverUser.country ?? null,
    locale: serverUser.locale,
  };
}
