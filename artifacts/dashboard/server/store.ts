import { randomUUID } from 'crypto';
import { DirectSecp256k1HdWallet, DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { pool } from './db';
import { getFirestoreDb } from './auth';

const ADDRESS_PREFIX = 'me';
const COLLECTION = 'wallets';

export interface StoredWallet {
  id: string;
  label: string;
  address: string;
  mnemonic?: string;
  privateKey?: string;
  verified: boolean;
  createdAt: string;
  type: 'mnemonic' | 'privatekey';
}

function rowToWallet(row: any): StoredWallet {
  return {
    id:         row.id,
    label:      row.label,
    address:    row.address,
    mnemonic:   row.mnemonic   ?? undefined,
    privateKey: row.private_key ?? undefined,
    verified:   row.verified,
    createdAt:  row.created_at,
    type:       row.type as 'mnemonic' | 'privatekey',
  };
}

// ── Primary Store: PostgreSQL ─────────────────────────────────────────────────

export async function getWallets(): Promise<StoredWallet[]> {
  const { rows } = await pool.query('SELECT * FROM wallets ORDER BY created_at ASC');
  return rows.map(rowToWallet);
}

export async function getWallet(id: string): Promise<StoredWallet | undefined> {
  const { rows } = await pool.query('SELECT * FROM wallets WHERE id = $1', [id]);
  return rows.length ? rowToWallet(rows[0]) : undefined;
}

/**
 * Returns true if newly inserted, false if address already exists (skipped).
 */
export async function insertWallet(w: StoredWallet): Promise<boolean> {
  const existing = await pool.query('SELECT id FROM wallets WHERE address = $1', [w.address]);
  if (existing.rows.length > 0) return false;

  await pool.query(
    `INSERT INTO wallets (id, label, address, mnemonic, private_key, verified, created_at, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [w.id, w.label, w.address, w.mnemonic ?? null, w.privateKey ?? null, w.verified, w.createdAt, w.type]
  );
  return true;
}

export async function removeWallet(id: string): Promise<boolean> {
  const result = await pool.query('DELETE FROM wallets WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
}

export async function updateWalletLabel(id: string, label: string): Promise<void> {
  await pool.query('UPDATE wallets SET label = $1 WHERE id = $2', [label, id]);
}

export async function markVerified(id: string): Promise<void> {
  await pool.query('UPDATE wallets SET verified = TRUE WHERE id = $1', [id]);
}

export async function getWalletCount(): Promise<number> {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM wallets');
  return rows[0].cnt ?? 0;
}

// ── One-time Firestore → PostgreSQL migration (WITH credentials) ──────────────
//
// Reads wallets that are missing credentials in PostgreSQL from Firestore,
// then upserts them with credentials. Batched to stay within Firestore rate limits.
// Safe to call on every startup — already-credentialed rows are skipped.

const MIGRATION_BATCH_SIZE = 10;
const MIGRATION_BATCH_DELAY_MS = 500;

export async function migrateFirestoreToPg(): Promise<void> {
  // Find wallets in PG that are missing credentials
  let missingIds: string[];
  try {
    const { rows } = await pool.query(
      `SELECT id FROM wallets WHERE mnemonic IS NULL AND private_key IS NULL ORDER BY created_at ASC`
    );
    missingIds = rows.map((r: any) => r.id);
  } catch (e: any) {
    console.error('[store] Firestore→PG: could not query missing credentials:', e?.message);
    return;
  }

  if (missingIds.length === 0) {
    console.log('[store] Firestore→PG: all wallets already have credentials in PostgreSQL ✓');
    return;
  }

  console.log(`[store] Firestore→PG: ${missingIds.length} wallet(s) missing credentials — fetching from Firestore in batches…`);

  let synced = 0;
  let failed = 0;
  const db = getFirestoreDb();

  // Process in batches to respect Firestore rate limits
  for (let i = 0; i < missingIds.length; i += MIGRATION_BATCH_SIZE) {
    const batch = missingIds.slice(i, i + MIGRATION_BATCH_SIZE);

    for (const id of batch) {
      try {
        const doc = await db.collection(COLLECTION).doc(id).get();
        if (!doc.exists) { failed++; continue; }
        const d = doc.data()!;
        await pool.query(
          `UPDATE wallets SET
             mnemonic    = COALESCE($1, mnemonic),
             private_key = COALESCE($2, private_key),
             label       = $3,
             verified    = $4
           WHERE id = $5`,
          [d.mnemonic ?? null, d.privateKey ?? null, d.label, d.verified ?? false, id]
        );
        synced++;
      } catch (err: any) {
        // Quota exceeded — stop and retry next startup
        if (err?.code === 8 || err?.message?.includes('RESOURCE_EXHAUSTED') || err?.message?.includes('Quota')) {
          console.warn(`[store] Firestore→PG: quota exceeded after ${synced} synced — will retry remaining ${missingIds.length - i - synced} on next startup`);
          return;
        }
        console.warn(`[store] Firestore→PG: skipped ${id}:`, err?.message);
        failed++;
      }
    }

    // Pause between batches to respect rate limits
    if (i + MIGRATION_BATCH_SIZE < missingIds.length) {
      await new Promise(r => setTimeout(r, MIGRATION_BATCH_DELAY_MS));
    }
  }

  console.log(`[store] Firestore→PG migration complete: ${synced} synced, ${failed} not found/errored`);
}

// ── Env wallet loader ─────────────────────────────────────────────────────────

export async function loadEnvWallet() {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) return;
  const clean = mnemonic.trim();
  try {
    const hdWallet = await DirectSecp256k1HdWallet.fromMnemonic(clean, { prefix: ADDRESS_PREFIX });
    const [account] = await hdWallet.getAccounts();
    const w: StoredWallet = {
      id:        randomUUID(),
      label:     'Primary Wallet',
      address:   account.address,
      mnemonic:  clean,
      verified:  true,
      createdAt: new Date().toISOString(),
      type:      'mnemonic',
    };
    const inserted = await insertWallet(w);
    if (inserted) console.log(`[store] Auto-imported primary wallet: ${account.address}`);
  } catch { /* invalid mnemonic or already exists */ }
}

// ── Bulk import ───────────────────────────────────────────────────────────────

export async function parseBulkImport(text: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const mnemonics:   string[] = [];
  const privateKeys: string[] = [];
  const errors:      string[] = [];

  const lines = text.split(/[\n]+/);
  for (const line of lines) {
    const clean = line.trim();
    if (!clean) continue;

    const hexMatch = clean.match(/^(?:0x)?([a-fA-F0-9]{64})$/);
    if (hexMatch) {
      const key = hexMatch[1];
      if (!privateKeys.includes(key)) privateKeys.push(key);
      continue;
    }

    const words = clean.toLowerCase().replace(/\s+/g, ' ').split(' ').filter(w => /^[a-z]+$/.test(w));
    if ([12, 15, 18, 21, 24].includes(words.length)) {
      const phrase = words.join(' ');
      if (!mnemonics.includes(phrase)) mnemonics.push(phrase);
    }
  }

  let imported  = 0;
  let skipped   = 0;
  const count   = await getWalletCount();
  let walletNum = count;

  for (let i = 0; i < mnemonics.length; i++) {
    try {
      const hdWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonics[i], { prefix: ADDRESS_PREFIX });
      const [account] = await hdWallet.getAccounts();
      walletNum++;
      const w: StoredWallet = {
        id:        randomUUID(),
        label:     `Wallet ${walletNum}`,
        address:   account.address,
        mnemonic:  mnemonics[i],
        verified:  false,
        createdAt: new Date().toISOString(),
        type:      'mnemonic',
      };
      const ok = await insertWallet(w);
      ok ? imported++ : skipped++;
    } catch (e: any) {
      errors.push(`Mnemonic ${i + 1}: ${e?.message ?? 'invalid'}`);
      skipped++;
    }
  }

  for (let i = 0; i < privateKeys.length; i++) {
    try {
      const keyBytes = Buffer.from(privateKeys[i], 'hex');
      const pkWallet = await DirectSecp256k1Wallet.fromKey(new Uint8Array(keyBytes), ADDRESS_PREFIX);
      const [account] = await pkWallet.getAccounts();
      walletNum++;
      const w: StoredWallet = {
        id:         randomUUID(),
        label:      `Wallet ${walletNum}`,
        address:    account.address,
        privateKey: privateKeys[i],
        verified:   false,
        createdAt:  new Date().toISOString(),
        type:       'privatekey',
      };
      const ok = await insertWallet(w);
      ok ? imported++ : skipped++;
    } catch (e: any) {
      errors.push(`Key ${i + 1}: ${e?.message ?? 'invalid'}`);
      skipped++;
    }
  }

  return { imported, skipped, errors };
}
