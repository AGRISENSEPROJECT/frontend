/** Matches backend PASSWORD_REGEX / IsStrongPassword. */
export const PASSWORD_HINT =
  'Password must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)';

export function validateStrongPassword(password: string): string {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[@$!%*?&]/.test(password)) {
    return 'Password must include a special character (@$!%*?&)';
  }
  // Backend also rejects other special chars outside the allowed set
  if (!/^[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
    return 'Password may only use letters, numbers, and @$!%*?&';
  }
  return '';
}
