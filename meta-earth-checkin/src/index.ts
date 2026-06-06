import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
import { log, logError } from './logger';
import { loadMnemonicsFromEnv, importWallets, WalletInfo } from './wallet';
import { runCheckinForAll } from './checkin';

dotenv.config();

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '0 8 * * *';
const NETWORK = process.env.NETWORK || 'mainnet';

async function main() {
  log('Meta Earth Check-in Bot starting...');
  log(`Network: ${NETWORK}`);

  const mnemonics = loadMnemonicsFromEnv();
  log(`Loaded ${mnemonics.length} wallet mnemonic(s) from environment.`);

  const wallets: WalletInfo[] = await importWallets(mnemonics);

  if (wallets.length === 0) {
    logError('No wallets could be imported. Check your MNEMONIC secrets.');
    process.exit(1);
  }

  if (process.env.RUN_ON_START === 'true') {
    log('RUN_ON_START=true — running check-in now...');
    await runCheckinForAll(wallets, NETWORK);
  }

  log(`Scheduling daily check-in: "${CRON_SCHEDULE}"`);
  cron.schedule(CRON_SCHEDULE, async () => {
    log('Cron triggered — running daily check-in...');
    try {
      await runCheckinForAll(wallets, NETWORK);
    } catch (err) {
      logError('Unexpected error during scheduled check-in', err);
    }
  });

  log('Bot is running. Waiting for next scheduled check-in...');
  log('Keep this process alive with Replit "Always On" or UptimeRobot.');
}

main().catch((err) => {
  logError('Fatal error during startup', err);
  process.exit(1);
});
