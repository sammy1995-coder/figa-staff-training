import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';
import { db } from '../db/index.ts';
import { users, homes } from '../db/schema.ts';
import { eq } from 'drizzle-orm';

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
  const customUserId = req.headers['x-user-id'] as string;

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
        // Fall through to custom auth header if token wasn't a valid Firebase JWT
      }
    }

    if (customUserId) {
      const userIdNum = parseInt(customUserId, 10);
      if (!isNaN(userIdNum)) {
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
          .where(eq(users.id, userIdNum));

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
