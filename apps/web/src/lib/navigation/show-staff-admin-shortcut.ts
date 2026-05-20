/**
 * Whether to show navigation shortcuts to `/admin`.
 * Matches the common case (super-admin or any non-empty adminRoles hint); `/admin`
 * layout still applies `AdminAuthorizationService.canAccessAdminShell` server-side.
 */
export function showsStaffAdminShortcut(user: {
  isAdmin?: boolean;
  adminRoles?: string[] | null;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  return Boolean(user.adminRoles?.length);
}
