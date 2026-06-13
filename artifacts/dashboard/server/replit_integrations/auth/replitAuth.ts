import type { Express, RequestHandler } from 'express';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let adminInitialized = false;

function loadServiceAccount(): admin.ServiceAccount | null {
  // 1. Try env var (production / secrets panel)
  const envStr = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envStr) {
    try { return JSON.parse(envStr); } catch { /* fall through */ }
  }
  // 2. Fall back to the file checked into attached_assets
  const candidates = [
    resolve(__dirname, '../../../../../attached_assets/meta-earth-dashboard-firebase-adminsdk-fbsvc-fc7bc918f4_1780859280125.json'),
    resolve(process.cwd(), 'attached_assets/meta-earth-dashboard-firebase-adminsdk-fbsvc-fc7bc918f4_1780859280125.json'),
  ];
  for (const p of candidates) {
    try { return JSON.parse(readFileSync(p, 'utf8')); } catch { /* try next */ }
  }
  return null;
}

function initAdmin() {
  if (adminInitialized) return;
  adminInitialized = true;

  const serviceAccount = loadServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('[auth] Firebase Admin initialised with service account');
    return;
  }

  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  console.warn('[auth] Firebase Admin initialised without service account — token verification may fail');
}

export async function setupAuth(app: Express) {
  initAdmin();
}

export function getSession() {
  return (_req: any, _res: any, next: any) => next();
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};
