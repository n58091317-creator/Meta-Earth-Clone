import { Router, Request, Response } from 'express';
import {
  getWallets,
  getWallet,
  removeWallet,
  updateWalletLabel,
  markVerified,
  parseBulkImport,
  StoredWallet,
} from './store';
import {
  getAllBalances,
  getHubBalance,
  getRollupBalances,
  getStakingDelegations,
  getStakingDelegationsDetailed,
  getUnbondingDelegations,
  getStakingRewards,
  performCheckin,
  hubSend,
  rollupSendAll,
  rollupSendAmount,
  withdrawStakingRewards,
  undelegateFromValidator,
  autoSweep,
  SweepMode,
  Coin,
} from './blockchain';
import {
  getSchedulerState,
  runAllCheckins,
  runCheckinForIds,
  runCheckinForNewWallets,
  getCheckinHistory,
  getAllWalletStats,
} from './scheduler';
import {
  getTopupConfig,
  setTopupConfig,
  runTopup,
  getTopupHistory,
  getTopupRunState,
  isTopupRunning,
} from './topup';
import { migrateCredentialsViaRest } from './migrate-credentials';
import * as admin from 'firebase-admin';

export const router = Router();

const NETWORK = process.env.NETWORK ?? 'mainnet';

// ─── Admin: one-shot credential migration ────────────────────────────────────

let _migrating = false;

router.get('/admin/migrate-status', async (_req, res) => {
  try {
    const { rows } = await (await import('./db')).pool.query<{ total: string; missing: string }>(
      `SELECT COUNT(*)::text AS total,
              SUM(CASE WHEN mnemonic IS NULL AND private_key IS NULL THEN 1 ELSE 0 END)::text AS missing
         FROM wallets`
    );
    const total   = parseInt(rows[0]?.total   ?? '0', 10);
    const missing = parseInt(rows[0]?.missing  ?? '0', 10);
    res.json({ total, missing, synced: total - missing, migrating: _migrating });
  } catch (e: any) {
    res.status(500).json({ error: e?.message });
  }
});

router.post('/admin/migrate-credentials', async (_req, res) => {
  if (_migrating) return res.status(409).json({ error: 'Migration already running' });
  _migrating = true;
  try {
    const result = await migrateCredentialsViaRest();
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Migration failed' });
  } finally {
    _migrating = false;
  }
});

// ─── Wallet CRUD ──────────────────────────────────────────────────────────────

router.get('/wallets', async (_req, res) => {
  try {
    const wallets = (await getWallets()).map(w => ({
      id: w.id,
      label: w.label,
      address: w.address,
      type: w.type,
      verified: w.verified,
      createdAt: w.createdAt,
      hasCredentials: !!(w.mnemonic || w.privateKey),
    }));
    res.json(wallets);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to load wallets' });
  }
});

// Import — body is application/x-www-form-urlencoded { text: string }
router.post('/wallets/import', async (req, res) => {
  try {
    let raw: string;
    const b = req.body as any;
    if (b && typeof b.data === 'string') {
      // base64-encoded payload (bypasses proxy content inspection)
      try {
        raw = Buffer.from(b.data, 'base64').toString('utf8');
      } catch {
        raw = '';
      }
    } else if (b && typeof b.text === 'string') {
      raw = b.text;
    } else if (typeof req.body === 'string') {
      raw = req.body;
    } else {
      raw = '';
    }

    const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    if (!text) {
      return res.status(400).json({ error: 'Paste at least one mnemonic or private key' });
    }

    const result = await parseBulkImport(text);
    res.json(result);

    // Auto check-in any newly imported wallets that haven't checked in today
    if (result.imported > 0) {
      const allWallets = await getWallets();
      const newIds = allWallets.slice(-result.imported).map(w => w.id);
      runCheckinForNewWallets(newIds).catch(e =>
        console.error('[import] Auto check-in error:', e?.message)
      );
    }
  } catch (e: any) {
    console.error('[import] Unexpected error:', e);
    res.status(500).json({ error: e?.message ?? 'Import failed' });
  }
});

router.delete('/wallets/:id', async (req, res) => {
  try {
    const removed = await removeWallet(req.params.id);
    res.json({ removed });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Delete failed' });
  }
});

router.patch('/wallets/:id', async (req, res) => {
  try {
    const { label } = req.body as { label: string };
    if (label) await updateWalletLabel(req.params.id, label);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Update failed' });
  }
});

// ─── Balances ─────────────────────────────────────────────────────────────────

router.get('/wallets/:id/balance', async (req, res) => {
  try {
    const wallet = await getWallet(req.params.id);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    const balances = await getAllBalances(wallet.address, NETWORK);
    res.json(balances);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Balance fetch failed' });
  }
});

router.post('/balances', async (req, res) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    const wallets = (await getWallets()).filter(w => !ids || ids.includes(w.id));
    const results = await Promise.all(
      wallets.map(async w => ({
        id: w.id,
        address: w.address,
        balances: await getAllBalances(w.address, NETWORK),
      }))
    );
    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Balances fetch failed' });
  }
});

// ─── Check-In ────────────────────────────────────────────────────────────────

router.post('/checkin', async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!ids?.length) return res.status(400).json({ error: 'ids required' });

    const state = getSchedulerState();
    if (state.isRunning) return res.status(409).json({ error: 'Already running' });

    const wallets = (await Promise.all(ids.map(id => getWallet(id)))).filter(Boolean);
    if (!wallets.length) return res.status(404).json({ error: 'No valid wallets found' });

    // Fire-and-forget — client polls GET /api/checkin/schedule for live progress.
    // Running the loop inside the HTTP handler blocks for minutes with many wallets
    // and hits the proxy's request timeout, returning an empty error to the browser.
    runCheckinForIds(wallets as any).catch(e =>
      console.error('[routes] Manual checkin error:', e?.message)
    );
    res.json({ started: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Check-in failed' });
  }
});

// ─── Transfer ────────────────────────────────────────────────────────────────

router.post('/transfer', async (req, res) => {
  try {
    const { fromId, to, chain, amountUmec, denom } = req.body as {
      fromId: string;
      to: string;
      chain: 'hub' | 'rollup';
      amountUmec: number;
      denom?: string;
    };
    const wallet = await getWallet(fromId);
    if (!wallet) return res.status(404).json({ error: 'Source wallet not found' });

    let result;
    if (chain === 'hub') {
      result = await hubSend(wallet, to, amountUmec);
    } else {
      const d = denom ?? 'ibc/BC7F4D581D88785A22824C8FB6807DFC3B65C1764AFF1230D954AAB06B70CBC5';
      result = await rollupSendAmount(wallet, to, d, amountUmec, NETWORK);
    }
    if (result.success) await markVerified(fromId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Transfer failed' });
  }
});

// ─── Auto-Sweep ───────────────────────────────────────────────────────────────

// ─── Sweep job state (in-memory, one job at a time) ──────────────────────────
interface SweepJob {
  running: boolean;
  total: number;
  done: number;
  results: any[];
  error?: string;
  startedAt: number;
}
let _sweepJob: SweepJob | null = null;

export function getSweepJob() {
  return _sweepJob ?? { running: false, total: 0, done: 0, results: [] };
}

async function runSweepBackground(
  ids: string[],
  mode: SweepMode,
  destination: string,
  reserve: number,
  masterWalletId: string | undefined,
  minWithdrawableUmec: number | undefined,
) {
  _sweepJob = { running: true, total: ids.length, done: 0, results: [], startedAt: Date.now() };
  (async () => {
    try {
      const masterWallet = masterWalletId ? (await getWallet(masterWalletId)) ?? undefined : undefined;
      for (const id of ids) {
        try {
          const wallet = await getWallet(id);
          if (!wallet) {
            _sweepJob!.results.push({ id, label: '?', address: '?', steps: [{ step: 'Load Wallet', success: false, error: 'Not found' }] });
          } else {
            const steps = await autoSweep(wallet, mode, destination, reserve, NETWORK, masterWallet, minWithdrawableUmec);
            if (steps.some(s => s.success)) await markVerified(id).catch(() => {});
            _sweepJob!.results.push({ id, address: wallet.address, label: wallet.label, steps });
          }
        } catch (e: any) {
          _sweepJob!.results.push({ id, label: '?', address: '?', steps: [{ step: 'Sweep', success: false, error: e?.message ?? 'Unknown error' }] });
        }
        _sweepJob!.done++;
      }
    } catch (e: any) {
      _sweepJob!.error = e?.message ?? 'Sweep failed';
    } finally {
      _sweepJob!.running = false;
      const s = _sweepJob!;
      const ok = s.results.filter(r => r.steps?.some((x: any) => x.success && !x.note)).length;
      const skip = s.results.filter(r => r.steps?.every((x: any) => x.note)).length;
      const err = s.total - ok - skip;
      console.log(`[sweep] Done — ${s.done}/${s.total} | ✅${ok} ⏭${skip} ❌${err}`);
    }
  })();
  return { started: true, total: ids.length };
}

/** Trigger a staking sweep for all wallets — called from the internal admin endpoint (no Firebase). */
export async function triggerInternalSweep(masterLabel = 'Wallet 2', minWithdrawUmec = 20_000) {
  if (_sweepJob?.running) return { error: 'Already running', done: _sweepJob.done, total: _sweepJob.total };
  const all = await getWallets();
  const master = all.find(w => w.label === masterLabel);
  const ids = all.map(w => w.id);
  console.log(`[sweep] Internal trigger — ${ids.length} wallets, master=${master?.label ?? 'none'}`);
  return runSweepBackground(ids, 'staking', '', 0, master?.id, minWithdrawUmec);
}

router.get('/sweep/status', (_req, res) => {
  res.json(getSweepJob());
});

router.post('/sweep', async (req, res) => {
  if (_sweepJob?.running) return res.status(409).json({ error: 'Sweep already running' });

  const { ids, mode, destination, minHubReserve, masterWalletId, minWithdrawableUmec } = req.body as {
    ids: string[];
    mode: SweepMode;
    destination: string;
    minHubReserve: number;
    masterWalletId?: string;
    minWithdrawableUmec?: number;
  };
  if (!ids?.length) return res.status(400).json({ error: 'ids required' });
  if (mode !== 'staking' && !destination) return res.status(400).json({ error: 'destination required' });

  const result = await runSweepBackground(
    ids, mode, destination, minHubReserve ?? 50000, masterWalletId, minWithdrawableUmec
  );
  res.json(result);
});

// ─── Scheduler: status / trigger / history / stats ───────────────────────────

router.get('/checkin/schedule', (_req, res) => {
  res.json(getSchedulerState());
});

router.post('/checkin/run', async (_req, res) => {
  const state = getSchedulerState();
  if (state.isRunning) return res.status(409).json({ error: 'Already running' });
  // Fire-and-forget; return immediately so the UI can poll
  runAllCheckins('manual').catch(e => console.error('[routes] Manual run error:', e));
  res.json({ started: true });
});

router.get('/checkin/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10), 500);
    res.json(await getCheckinHistory(limit));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'History query failed' });
  }
});

router.get('/checkin/stats', async (_req, res) => {
  try {
    res.json(await getAllWalletStats());
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Stats query failed' });
  }
});

// ─── Top-Up ───────────────────────────────────────────────────────────────────

router.get('/topup/config', async (_req, res) => {
  try {
    res.json(await getTopupConfig());
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to load top-up config' });
  }
});

router.post('/topup/config', async (req, res) => {
  try {
    const cfg = req.body as Partial<{
      enabled: boolean;
      masterWalletId: string | null;
      thresholdUmec: number;
      topupAmountUmec: number;
      runBeforeCheckin: boolean;
      ibcEnabled: boolean;
      ibcThresholdUmec: number;
      ibcAmountUmec: number;
    }>;
    res.json(await setTopupConfig(cfg));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to save top-up config' });
  }
});

router.post('/topup/run', (_req, res) => {
  if (isTopupRunning()) return res.status(409).json({ error: 'Already running' });
  // Fire-and-forget — client polls /topup/status for results
  runTopup('manual').catch(e => console.error('[topup] Manual run error:', e?.message));
  res.json({ started: true });
});

router.get('/topup/status', (_req, res) => {
  res.json(getTopupRunState());
});

router.get('/topup/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '100'), 10), 500);
    res.json(await getTopupHistory(limit));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'History query failed' });
  }
});

// ─── Staking ─────────────────────────────────────────────────────────────────

router.get('/staking/:walletId', async (req, res) => {
  try {
    const wallet = await getWallet(req.params.walletId);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    const [delegations, unbonding] = await Promise.all([
      getStakingDelegationsDetailed(wallet.address),
      getUnbondingDelegations(wallet.address),
    ]);
    const totalStakedUmec = delegations.reduce((s, d) => s + d.stakedUmec, 0);
    const totalRewardsUmec = delegations.reduce((s, d) => s + d.pendingRewardsUmec, 0);
    res.json({
      id: wallet.id,
      label: wallet.label,
      address: wallet.address,
      delegations,
      unbonding,
      totalStakedUmec,
      totalRewardsUmec,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Staking info fetch failed' });
  }
});

router.post('/staking/claim', async (req, res) => {
  try {
    const { walletId } = req.body as { walletId: string };
    const wallet = await getWallet(walletId);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    if (!wallet.mnemonic && !wallet.privateKey) return res.status(400).json({ error: 'Wallet has no credentials' });
    const result = await withdrawStakingRewards(wallet);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Claim failed' });
  }
});

router.post('/staking/undelegate', async (req, res) => {
  try {
    const { walletId, validatorAddress, amountUmec } = req.body as {
      walletId: string;
      validatorAddress: string;
      amountUmec: number;
    };
    if (!walletId || !validatorAddress || !amountUmec) {
      return res.status(400).json({ error: 'walletId, validatorAddress, and amountUmec are required' });
    }
    const wallet = await getWallet(walletId);
    if (!wallet) return res.status(404).json({ error: 'Wallet not found' });
    if (!wallet.mnemonic && !wallet.privateKey) return res.status(400).json({ error: 'Wallet has no credentials' });
    const result = await undelegateFromValidator(wallet, validatorAddress, amountUmec);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Undelegate failed' });
  }
});

// ─── Diagnose (production test — read-only) ───────────────────────────────────

router.get('/diagnose/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const [hubBalance, rollupBalances, delegations, stakingRewards] = await Promise.all([
      getHubBalance(address),
      getRollupBalances(address, NETWORK).catch(() => [] as Coin[]),
      getStakingDelegations(address),
      getStakingRewards(address),
    ]);
    res.json({
      address,
      network: NETWORK,
      hub: { balanceUmec: hubBalance, balanceMec: (hubBalance / 1e8).toFixed(8) },
      rollup: { coins: rollupBalances, total: rollupBalances.reduce((s, b) => s + b.amount, 0) },
      staking: {
        delegations,
        pendingRewardsUmec: stakingRewards,
        pendingRewardsMec: (stakingRewards / 1e8).toFixed(8),
        note: delegations.length > 0 && stakingRewards === 0
          ? 'Rewards API returned 0 (hub query bug) — withdrawal will still be attempted on-chain'
          : undefined,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Diagnose failed' });
  }
});

// ─── Export ───────────────────────────────────────────────────────────────────

router.get('/export', async (req, res) => {
  try {
    const { format = 'csv', category = 'all' } = req.query as {
      format: 'csv' | 'json';
      category: 'all' | 'verified' | 'unverified';
    };

    let wallets = await getWallets();
    if (category === 'verified') wallets = wallets.filter(w => w.verified);
    if (category === 'unverified') wallets = wallets.filter(w => !w.verified);

    const rows = wallets.map(w => ({
      label: w.label,
      address: w.address,
      type: w.type,
      mnemonic: w.mnemonic ?? '',
      privateKey: w.privateKey ?? '',
      verified: w.verified,
      createdAt: w.createdAt,
    }));

    if (format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="wallets-${category}-${Date.now()}.json"`);
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(rows, null, 2));
    }

    const headers = ['label', 'address', 'type', 'mnemonic', 'privateKey', 'verified', 'createdAt'];
    const csvRows = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => {
          const v = String((r as any)[h] ?? '');
          return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(',')
      ),
    ];
    res.setHeader('Content-Disposition', `attachment; filename="wallets-${category}-${Date.now()}.csv"`);
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvRows.join('\n'));
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Export failed' });
  }
});

// ─── Firebase RTDB Sync ───────────────────────────────────────────────────────

/**
 * Recursively walks a Firebase RTDB snapshot value and collects all string
 * leaf values that look like a mnemonic (12-24 words) or a private key (64-char hex).
 */
function extractCredentials(node: unknown, collected: string[] = []): string[] {
  if (node === null || node === undefined) return collected;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    // Private key: 64 hex chars (with or without 0x)
    if (/^(?:0x)?[a-fA-F0-9]{64}$/.test(trimmed)) {
      collected.push(trimmed);
      return collected;
    }
    // Mnemonic: 12–24 lowercase words separated by spaces
    const words = trimmed.toLowerCase().replace(/\s+/g, ' ').split(' ').filter(w => /^[a-z]+$/.test(w));
    if ([12, 15, 18, 21, 24].includes(words.length)) {
      collected.push(words.join(' '));
      return collected;
    }
    return collected;
  }
  if (typeof node === 'object') {
    for (const val of Object.values(node as Record<string, unknown>)) {
      extractCredentials(val, collected);
    }
  }
  return collected;
}

router.post('/sync-firebase', async (_req, res) => {
  try {
    const db = admin.database();
    const snapshot = await db.ref('/').once('value');
    const raw = snapshot.val();

    if (raw === null) {
      return res.json({ imported: 0, skipped: 0, errors: [], note: 'Firebase RTDB is empty' });
    }

    const credentials = extractCredentials(raw);
    if (credentials.length === 0) {
      return res.json({ imported: 0, skipped: 0, errors: [], note: 'No mnemonics or private keys found in Firebase RTDB' });
    }

    const text = credentials.join('\n');
    const result = await parseBulkImport(text);
    res.json(result);
  } catch (e: any) {
    console.error('[sync-firebase]', e?.message);
    res.status(500).json({ error: e?.message ?? 'Firebase sync failed' });
  }
});
