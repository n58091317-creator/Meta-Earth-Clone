import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { initDb } from './db';
import { loadEnvWallet } from './store';
import { router, triggerInternalSweep, getSweepJob } from './routes';
import { startScheduler } from './scheduler';
import { setupAuth, isAuthenticated, registerAuthRoutes } from './auth';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const app  = express();
const PORT = parseInt(process.env.PORT ?? '5000', 10);

async function start() {
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.text({ type: 'text/plain', limit: '10mb' }));

  // Set up Replit Auth FIRST (installs session + passport middleware)
  await setupAuth(app);

  // Auth routes (/api/login, /api/callback, /api/logout, /api/auth/user)
  registerAuthRoutes(app);

  // ─── Internal admin endpoints — no auth, secret-header-only ───────────────
  const INTERNAL_SECRET = 'sweep-internal-2026';

  app.post('/internal/sweep', (req: Request, res: Response) => {
    if (req.headers['x-admin-secret'] !== INTERNAL_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const body = req.body as { masterLabel?: string; minWithdrawUmec?: number };
    triggerInternalSweep(body.masterLabel ?? 'Wallet 2', body.minWithdrawUmec ?? 20_000)
      .then(r => res.json(r))
      .catch(e => res.status(500).json({ error: e?.message }));
  });

  app.get('/internal/sweep/status', (req: Request, res: Response) => {
    if (req.headers['x-admin-secret'] !== INTERNAL_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(getSweepJob());
  });

  // All /api routes require a valid session
  app.use('/api', isAuthenticated, router);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500;
    const message = err.type === 'entity.parse.failed'
      ? 'Invalid JSON body — if you have special characters in your text, try again'
      : (err.message ?? 'Internal server error');
    console.error('[server] Error:', err.message);
    res.status(status).json({ error: message });
  });

  // Serve the built frontend
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('/*path', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Listen immediately so the proxy can connect
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[dashboard] Running at http://0.0.0.0:${PORT}`);
    console.log(`[dashboard] Network: ${process.env.NETWORK ?? 'mainnet'}`);
  });

  // Heavy init in background — errors logged but don't crash the server
  try {
    await initDb();
    await loadEnvWallet();
    startScheduler();
  } catch (e) {
    console.error('[server] Startup error:', e);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
});

start();
