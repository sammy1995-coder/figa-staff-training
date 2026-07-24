import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// A precomputed, valid bcrypt hash of an arbitrary string with no
// corresponding account. Used so a login lookup for an unknown user still
// pays the same bcrypt cost as a real one, instead of short-circuiting and
// letting response timing reveal whether an email/username exists.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('no-such-account-timing-safety', SALT_ROUNDS);

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export function verifyPassword(plainTextPassword: string, hash: string | null): Promise<boolean> {
  if (!hash) return Promise.resolve(false);
  return bcrypt.compare(plainTextPassword, hash);
}

export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
