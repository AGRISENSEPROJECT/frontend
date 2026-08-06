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
  if (!role) return true; // older sessions without role — allow through
  return String(role).toUpperCase() === 'FARMER';
}
