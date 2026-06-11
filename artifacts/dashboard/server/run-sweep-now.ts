/**
 * Direct server-side sweep runner — no HTTP, no proxy, no timeout.
 * Usage: tsx server/run-sweep-now.ts
 */
import 'dotenv/config';
import { initDb } from './db';
import { getWallets, getWallet, markVerified } from './store';
import { autoSweep } from './blockchain';

const MASTER_WALLET_LABEL = 'Wallet 2';
const MODE   = 'staking' as const;
const MIN_WITHDRAW_UMEC = 20_000;   // 0.0002 MEC
const NETWORK = process.env.NETWORK ?? 'mainnet';
const RETRY_ERRORS = ['timeout', 'ETIMEDOUT', 'ECONNRESET', 'socket hang up', 'connection refused'];
const MAX_RETRIES  = 3;
const RETRY_DELAY  = 5_000;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRetryable = RETRY_ERRORS.some(s => (e?.message ?? '').toLowerCase().includes(s.toLowerCase()));
      if (isRetryable && attempt < MAX_RETRIES) {
        const wait = RETRY_DELAY * attempt;
        console.log(`  ↻ [${label}] attempt ${attempt} failed (${e.message}) — retry in ${wait / 1000}s`);
        await sleep(wait);
      } else {
        throw e;
      }
    }
  }
  throw new Error('unreachable');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Meta Earth Staking Sweep — direct runner');
  console.log(`  Network : ${NETWORK}`);
  console.log(`  Mode    : ${MODE}`);
  console.log(`  Min     : ${MIN_WITHDRAW_UMEC} umec (${MIN_WITHDRAW_UMEC / 1e8} MEC)`);
  console.log('═══════════════════════════════════════════════════════');

  await initDb();
  const all = await getWallets();
  console.log(`Loaded ${all.length} wallets from PostgreSQL`);

  const master = all.find(w => w.label === MASTER_WALLET_LABEL);
  if (master) {
    console.log(`Master wallet: ${master.label} (${master.address})`);
  } else {
    console.warn(`⚠  Master wallet "${MASTER_WALLET_LABEL}" not found — wallets without gas will be skipped`);
  }

  let successTotal = 0, skippedTotal = 0, errorTotal = 0;
  const errors: { wallet: string; error: string }[] = [];

  for (let i = 0; i < all.length; i++) {
    const wallet = all[i];
    const prefix = `[${String(i + 1).padStart(3, '0')}/${all.length}] ${wallet.label}`;
    process.stdout.write(`${prefix} ... `);

    try {
      const steps = await withRetry(wallet.label, () =>
        autoSweep(wallet, MODE, '', 0, NETWORK, master, MIN_WITHDRAW_UMEC)
      );

      const anySuccess  = steps.some(s => s.success && !s.note);
      const anyError    = steps.some(s => !s.success);
      const allSkipped  = steps.every(s => s.note?.toLowerCase().includes('skip') || s.note?.toLowerCase().includes('threshold'));

      if (anySuccess) {
        await markVerified(wallet.id).catch(() => {});
        successTotal++;
        const txs = steps.filter(s => s.txHash).map(s => `TX:${s.txHash}`).join(' ');
        console.log(`✅  ${txs || '(ok)'}`);
        steps.forEach(s => {
          if (s.note)  console.log(`    ℹ  ${s.step}: ${s.note}`);
          if (s.error) console.log(`    ⚠  ${s.step}: ${s.error}`);
        });
      } else if (allSkipped) {
        skippedTotal++;
        const note = steps.find(s => s.note)?.note ?? 'below threshold';
        console.log(`⏭  ${note}`);
      } else {
        errorTotal++;
        const errMsg = steps.find(s => !s.success)?.error ?? 'unknown';
        errors.push({ wallet: wallet.label, error: errMsg });
        console.log(`❌  ${errMsg}`);
        steps.forEach(s => {
          if (s.error) console.log(`    ✗ ${s.step}: ${s.error}`);
          if (s.note)  console.log(`    ℹ ${s.step}: ${s.note}`);
        });
      }
    } catch (e: any) {
      errorTotal++;
      const errMsg = e?.message ?? 'Unexpected error';
      errors.push({ wallet: wallet.label, error: errMsg });
      console.log(`❌  EXCEPTION: ${errMsg}`);
    }

    // Brief pause to avoid hammering the RPC
    if ((i + 1) % 10 === 0) {
      console.log(`  … pausing 1s (every 10 wallets) …`);
      await sleep(1000);
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log(` SWEEP COMPLETE`);
  console.log(`  ✅  Successful : ${successTotal}`);
  console.log(`  ⏭  Skipped    : ${skippedTotal}`);
  console.log(`  ❌  Errors     : ${errorTotal}`);
  if (errors.length > 0) {
    console.log('');
    console.log('  Error detail:');
    errors.forEach(e => console.log(`    ${e.wallet}: ${e.error}`));
  }
  console.log('═══════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
