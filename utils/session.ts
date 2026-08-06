import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '@/config/env';
import type { AuthUser } from '@/services/api';
import { userHasFarm } from '@/services/api';
import { isFarmerRole } from '@/utils/userDisplay';

export const SESSION_KEYS = [
  'token',
  'refreshToken',
  'user',
  'skipFarm',
  'preferredFarmId',
] as const;

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([...SESSION_KEYS]);
}

export async function persistAuthSession(data: {
  accessToken: string;
  refreshToken?: string | null;
  user: AuthUser;
}): Promise<void> {
  await AsyncStorage.setItem('token', data.accessToken);
  if (data.refreshToken) {
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
  }
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  if (ENV.API_URL) {
    await AsyncStorage.setItem('api_url_bound', ENV.API_URL);
  }
}

export async function readStoredUser(): Promise<AuthUser | null> {
  try {
    const raw = await AsyncStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function writeStoredUser(user: AuthUser): Promise<void> {
  await AsyncStorage.setItem('user', JSON.stringify(user));
}

/** Farmer still needs identity and/or first farm before the app is fully set up. */
export function needsFarmerOnboarding(
  user: AuthUser | null | undefined,
  skipFarm = false,
): boolean {
  if (!user) return true;
  if (skipFarm) return false;
  if (user.onboardingCompleted) return false;
  if (userHasFarm(user)) return false;
  return true;
}

/**
 * Where to send a farmer after a successful login / cold-start profile check.
 * Returns a path string (may include query for verifyEmail).
 */
export function getPostAuthRoute(
  user: AuthUser,
  opts?: { skipFarm?: boolean },
): string {
  if (!isFarmerRole(user.role)) {
    return '/signin';
  }
  if (user.isEmailVerified === false) {
    return `/verifyEmail?email=${encodeURIComponent(user.email || '')}&userId=${user.id || ''}`;
  }
  if (needsFarmerOnboarding(user, opts?.skipFarm)) {
    return '/RegisterFarm';
  }
  return '/(main)/dashboard';
}
