/**
 * Firestore → PostgreSQL credential migration using the Firestore REST API.
 *
 * The Firestore Admin SDK uses gRPC (which can exhaust its quota independently).
 * This module calls the Firestore HTTP REST API directly, which runs under a
 * separate quota and can batch-fetch up to 300 documents in a single request.
 */
import * as admin from 'firebase-admin';
import { pool } from './db';
import { ensureAdmin } from './auth';

const PROJECT_ID  = process.env.FIREBASE_PROJECT_ID ?? 'meta-earth-dashboard';
const COLLECTION  = 'wallets';
const BATCH_SIZE  = 300; // Firestore REST batchGet limit

interface FirestoreValue {
  stringValue?: string;
  booleanValue?: boolean;
  nullValue?: null;
  integerValue?: string;
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

interface BatchGetResponse {
  found?: FirestoreDocument;
  missing?: string;
}

function getString(fields: Record<string, FirestoreValue>, key: string): string | undefined {
  return fields[key]?.stringValue ?? undefined;
}

function getBool(fields: Record<string, FirestoreValue>, key: string): boolean {
  return fields[key]?.booleanValue ?? false;
}

async function getAccessToken(): Promise<string> {
  ensureAdmin();
  const cred = admin.app().options.credential!;
  const token = await cred.getAccessToken();
  return token.access_token;
}

async function firestoreBatchGet(
  docPaths: string[],
  accessToken: string
): Promise<BatchGetResponse[]> {
  const documents = docPaths.map(
    id => `projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${id}`
  );
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:batchGet`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documents }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore REST batchGet failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<BatchGetResponse[]>;
}

export interface MigrationResult {
  total: number;
  synced: number;
  alreadyHad: number;
  noCredentials: number;
  errors: string[];
}

/**
 * Fetch credentials for all wallets in PG that have NULL mnemonic AND NULL private_key,
 * using the Firestore REST API (bypasses gRPC quota limits).
 */
export async function migrateCredentialsViaRest(): Promise<MigrationResult> {
  const result: MigrationResult = { total: 0, synced: 0, alreadyHad: 0, noCredentials: 0, errors: [] };

  // 1. Find wallets in PG that are missing credentials
  const { rows: missing } = await pool.query<{ id: string }>(
    `SELECT id FROM wallets WHERE mnemonic IS NULL AND private_key IS NULL ORDER BY created_at ASC`
  );

  if (missing.length === 0) {
    console.log('[migrate] All wallets already have credentials in PostgreSQL ✓');
    result.alreadyHad = (await pool.query('SELECT COUNT(*)::int AS c FROM wallets')).rows[0].c;
    return result;
  }

  result.total = missing.length;
  console.log(`[migrate] ${missing.length} wallet(s) missing credentials — fetching via Firestore REST API…`);

  // 2. Get an OAuth2 access token from the already-initialised firebase-admin
  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch (e: any) {
    throw new Error(`Failed to get Firebase access token: ${e?.message}`);
  }

  // 3. Batch-fetch from Firestore REST API (up to 300 docs per request)
  const ids = missing.map(r => r.id);
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    let responses: BatchGetResponse[];
    try {
      responses = await firestoreBatchGet(batch, accessToken);
    } catch (e: any) {
      const msg = `Firestore REST batch failed (offset ${i}): ${e?.message}`;
      console.error('[migrate]', msg);
      result.errors.push(msg);
      continue;
    }

    // 4. Write credentials to PostgreSQL
    for (const resp of responses) {
      if (resp.missing) {
        result.noCredentials++;
        continue;
      }
      if (!resp.found?.fields) {
        result.noCredentials++;
        continue;
      }

      const fields   = resp.found.fields;
      const docPath  = resp.found.name;
      const id       = docPath.split('/').pop()!;
      const mnemonic   = getString(fields, 'mnemonic')   ?? null;
      const privateKey = getString(fields, 'privateKey') ?? null;
      const label      = getString(fields, 'label')      ?? 'Wallet';
      const verified   = getBool(fields, 'verified');

      if (!mnemonic && !privateKey) {
        result.noCredentials++;
        continue;
      }

      try {
        await pool.query(
          `UPDATE wallets
             SET mnemonic    = COALESCE($1, mnemonic),
                 private_key = COALESCE($2, private_key),
                 label       = $3,
                 verified    = $4
           WHERE id = $5`,
          [mnemonic, privateKey, label, verified, id]
        );
        result.synced++;
      } catch (e: any) {
        const msg = `PG update failed for ${id}: ${e?.message}`;
        result.errors.push(msg);
      }
    }

    // Small pause between batches (shouldn't be needed for 1 batch of ≤300 docs)
    if (i + BATCH_SIZE < ids.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  const { synced, noCredentials, errors } = result;
  console.log(`[migrate] Done — ${synced} synced, ${noCredentials} had no credentials in Firestore, ${errors.length} errors`);
  return result;
}
