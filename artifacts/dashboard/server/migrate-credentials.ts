import { pool } from './db';

export interface MigrationResult {
  total: number;
  synced: number;
  alreadyHad: number;
  noCredentials: number;
  errors: string[];
}

/**
 * Check migration status — wallets that still have no credentials in PG.
 * The Firestore migration is no longer performed; all data should already be in PG.
 */
export async function migrateCredentialsViaRest(): Promise<MigrationResult> {
  const result: MigrationResult = { total: 0, synced: 0, alreadyHad: 0, noCredentials: 0, errors: [] };

  const { rows: missing } = await pool.query<{ id: string }>(
    `SELECT id FROM wallets WHERE mnemonic IS NULL AND private_key IS NULL ORDER BY created_at ASC`
  );

  const { rows: total } = await pool.query<{ c: number }>('SELECT COUNT(*)::int AS c FROM wallets');
  result.total = missing.length;
  result.alreadyHad = (total[0]?.c ?? 0) - missing.length;
  result.noCredentials = missing.length;

  if (missing.length === 0) {
    console.log('[migrate] All wallets have credentials in PostgreSQL ✓');
  } else {
    console.log(`[migrate] ${missing.length} wallet(s) have no credentials stored`);
  }

  return result;
}
