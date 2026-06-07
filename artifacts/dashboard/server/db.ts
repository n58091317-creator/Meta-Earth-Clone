import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallets (
      id          TEXT PRIMARY KEY,
      label       TEXT NOT NULL,
      address     TEXT NOT NULL UNIQUE,
      mnemonic    TEXT,
      private_key TEXT,
      verified    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TEXT NOT NULL,
      type        TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkin_log (
      id          BIGSERIAL PRIMARY KEY,
      wallet_id   TEXT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
      success     BOOLEAN NOT NULL,
      tx_hash     TEXT,
      error       TEXT
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS checkin_log_wallet_date_idx
    ON checkin_log (wallet_id, executed_at DESC)
  `);

  console.log('[db] Tables ready (wallets + checkin_log)');
}
