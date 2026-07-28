import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.js';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.js';
import { users, homes } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { parseCookies, verifySessionToken, SESSION_COOKIE_NAME } from '../lib/session.js';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    uid: string;
    email: string;
    username: string;
    role: string;
    homeId: number | null;
    homeName?: string;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  try {
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const [dbUser] = await db
          .select({
            id: users.id,
            uid: users.uid,
            email: users.email,
            username: users.username,
            role: users.role,
            homeId: users.homeId,
            homeName: homes.name,
          })
          .from(users)
          .leftJoin(homes, eq(users.homeId, homes.id))
          .where(eq(users.uid, decodedToken.uid));

        if (dbUser) {
          req.user = {
            id: dbUser.id,
            uid: dbUser.uid,
            email: dbUser.email,
            username: dbUser.username,
            role: dbUser.role,
            homeId: dbUser.homeId,
            homeName: dbUser.homeName || undefined,
          };
          return next();
        }
      } catch (fbErr) {
        // Fall through to the server-issued session cookie if the token
        // wasn't a valid Firebase JWT.
      }
    }

    // Server-signed session cookie set by POST /api/auth/login. This is the
    // only other trusted identity source — a client-supplied user id header
    // is never honored, since that would let any caller impersonate anyone.
    const cookies = parseCookies(req);
    const sessionUserId = verifySessionToken(cookies[SESSION_COOKIE_NAME]);

    if (sessionUserId !== null) {
      const [dbUser] = await db
        .select({
          id: users.id,
          uid: users.uid,
          email: users.email,
          username: users.username,
          role: users.role,
          homeId: users.homeId,
          homeName: homes.name,
        })
        .from(users)
        .leftJoin(homes, eq(users.homeId, homes.id))
        .where(eq(users.id, sessionUserId));

      if (dbUser) {
        req.user = {
          id: dbUser.id,
          uid: dbUser.uid,
          email: dbUser.email,
          username: dbUser.username,
          role: dbUser.role,
          homeId: dbUser.homeId,
          homeName: dbUser.homeName || undefined,
        };
        return next();
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server authentication error' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
