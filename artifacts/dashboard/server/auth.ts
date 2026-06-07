import type { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

let _initialised = false;

function ensureAdmin() {
  if (_initialised) return;
  _initialised = true;
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID ?? 'meta-earth-dashboard',
  });
}

/**
 * Express middleware — verifies the Firebase ID token from the
 * `Authorization: Bearer <token>` header.
 * Returns 401 if missing or invalid, otherwise sets req.uid and calls next().
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  ensureAdmin();
  const header = req.headers.authorization ?? '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorised — no token' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).uid   = decoded.uid;
    (req as any).email = decoded.email ?? null;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorised — invalid or expired token' });
  }
}
