/** Shared farmer user display helpers — match backend mapUserProfile / mapToAuthor. */

export type DisplayableUser = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
};

export function userDisplayName(user?: DisplayableUser | null): string {
  if (!user) return 'Farmer';
  if (user.displayName?.trim()) return user.displayName.trim();
  const fromNames = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fromNames) return fromNames;
  if (user.username?.trim()) return user.username.trim();
  if (user.email?.trim()) return user.email.split('@')[0] || user.email;
  return 'Farmer';
}

export function isFarmerRole(role?: string | null): boolean {
  // Backend always returns role on login/profile. Non-farmers must not use this app.
  if (!role) return false;
  return String(role).toUpperCase() === 'FARMER';
}
