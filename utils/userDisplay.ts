/** Shared farmer user display helpers — match backend mapUserProfile / mapToAuthor. */

export type DisplayableUser = {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
  deleted?: boolean | null;
  status?: string | null;
};

function looksLikeEmail(value?: string | null) {
  return !!value && /@/.test(value);
}

function stripEmail(value: string) {
  return value.replace(/\S+@\S+/g, '').replace(/\s+/g, ' ').trim();
}

export function userDisplayName(
  user?: DisplayableUser | null,
  opts?: { preferNames?: boolean },
): string {
  if (!user) return 'Farmer';
  const fromNames = [user.firstName, user.lastName]
    .filter((part) => part && !looksLikeEmail(part))
    .join(' ')
    .trim();
  const display = user.displayName?.trim() || '';
  const userName = user.username?.trim() || '';

  // First/last are the source of truth — ignore stale or email-like displayName.
  if (fromNames && (opts?.preferNames || !display || looksLikeEmail(display))) {
    return fromNames;
  }
  if (fromNames) return fromNames;
  if (display && !looksLikeEmail(display)) return display;
  if (userName && !looksLikeEmail(userName)) return userName;
  if (display) {
    const cleaned = stripEmail(display);
    if (cleaned) return cleaned;
  }
  if (user.email?.trim()) return user.email.split('@')[0] || 'Farmer';
  return 'Farmer';
}

/** Title-case ALL CAPS labels so feed names match the prototype (e.g. NIBISHAKA → Nibishaka). */
export function formatPersonName(name: string): string {
  const value = name.trim();
  if (!value) return value;
  const letters = value.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 2 && letters === letters.toUpperCase()) {
    return value
      .toLowerCase()
      .replace(/(^|[\s'-])(\w)/g, (_, lead: string, char: string) => lead + char.toUpperCase());
  }
  return value;
}

export function isDeletedAccount(
  user?: DisplayableUser | { name?: string | null; deleted?: boolean | null } | null,
): boolean {
  if (!user) return false;
  if ('deleted' in user && user.deleted) return true;
  const status = 'status' in user ? String(user.status || '').toUpperCase() : '';
  if (status === 'BANNED' || status === 'DELETED') return true;
  const label = [
    'displayName' in user ? user.displayName : null,
    'username' in user ? user.username : null,
    'name' in user ? user.name : null,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return label.includes('deleted account');
}

export function isFarmerRole(role?: string | null): boolean {
  // Backend always returns role on login/profile. Non-farmers must not use this app.
  if (!role) return false;
  return String(role).toUpperCase() === 'FARMER';
}
