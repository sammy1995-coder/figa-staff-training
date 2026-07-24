import crypto from 'crypto';
import type { Request } from 'express';

const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PASSWORD_CHANGE_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

function getSecret(): string {
  const configured = process.env.SESSION_SECRET;
  if (configured) return configured;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production to sign login sessions.');
  }

  // Dev-only fallback so `npm run dev` works without extra setup. Sessions
  // will not survive a server restart, which is fine locally but must never
  // happen in production (guarded above).
  if (!global.__devSessionSecret) {
    global.__devSessionSecret = crypto.randomBytes(32).toString('hex');
    console.warn(
      '[session] SESSION_SECRET is not set — using a random development-only secret. ' +
        'Set SESSION_SECRET in .env before deploying.'
    );
  }
  return global.__devSessionSecret;
}

declare global {
  var __devSessionSecret: string | undefined;
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

// `purpose` is part of the signed payload so a password-change token can
// never be replayed as a real login session (or vice versa) even though
// both are HMAC-signed with the same secret.
type TokenPurpose = 'session' | 'password_change';

function createToken(userId: number, purpose: TokenPurpose, maxAgeMs: number): string {
  const expiresAt = Date.now() + maxAgeMs;
  const payload = `${userId}.${expiresAt}.${purpose}`;
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string | undefined | null, expectedPurpose: TokenPurpose): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;

  const [userIdStr, expiresAtStr, purpose, signature] = parts;
  if (purpose !== expectedPurpose) return null;

  const payload = `${userIdStr}.${expiresAtStr}.${purpose}`;
  const expectedSignature = sign(payload);

  const provided = Buffer.from(signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null;
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  const userId = parseInt(userIdStr, 10);
  return Number.isFinite(userId) ? userId : null;
}

export function createSessionToken(userId: number): string {
  return createToken(userId, 'session', SESSION_MAX_AGE_MS);
}

export function verifySessionToken(token: string | undefined | null): number | null {
  return verifyToken(token, 'session');
}

// Issued instead of a session cookie when a user must set a new password
// before they're allowed into the app (first login on an admin-created
// account). Short-lived and single-purpose — it only unlocks the
// set-initial-password endpoint, nothing else.
export function createPasswordChangeToken(userId: number): string {
  return createToken(userId, 'password_change', PASSWORD_CHANGE_TOKEN_MAX_AGE_MS);
}

export function verifyPasswordChangeToken(token: string | undefined | null): number | null {
  return verifyToken(token, 'password_change');
}

export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};

  return header.split(';').reduce<Record<string, string>>((acc, pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return acc;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}

export { SESSION_COOKIE_NAME };
