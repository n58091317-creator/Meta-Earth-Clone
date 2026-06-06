import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
  OfflineSigner,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
import { Type, Field, Root } from 'protobufjs';
import { log, logError } from './logger';
import { WalletInfo } from './wallet';

/**
 * Meta Earth hub RPC endpoints.
 * Source: meta-earth-js-sdk/src/config/define.ts
 * The daily check-in (MsgNewRecord) is on the me-hub chain.
 */
const RPC_ENDPOINTS: Record<string, string> = {
  mainnet: 'http://118.175.0.247:16657',
  testnet: 'http://118.175.0.249:26657',
};

const ADDRESS_PREFIX = 'me';

/**
 * MsgNewRecord type URL on the me-hub (metaearth.wstaking module).
 * This is the actual "daily check-in" / record submission used by Meta Earth users.
 *
 * Fields (protobuf order):
 *   1: actionNumber  — alphanumeric identifier, unique per submission
 *   2: actionUrl     — URL for the record (e.g. a social media post)
 *   3: from          — signer wallet address
 */
const MSG_TYPE_URL = '/metaearth.wstaking.MsgNewRecord';

function buildMsgNewRecordType(): Type {
  const root = new Root();
  const MsgNewRecord = new Type('MsgNewRecord')
    .add(new Field('actionNumber', 1, 'string'))
    .add(new Field('actionUrl', 2, 'string'))
    .add(new Field('from', 3, 'string'));
  root.add(MsgNewRecord);
  return MsgNewRecord;
}

const MsgNewRecordType = buildMsgNewRecordType();

/**
 * Generate a daily action number. Uses the current UTC date so each day
 * produces a unique record for the address (but is idempotent within one day).
 * Override with the ACTION_NUMBER env var for a fully custom value.
 */
function getActionNumber(): string {
  const custom = process.env.ACTION_NUMBER;
  if (custom) return custom;
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `DailyCheckIn${date}`;
}

/**
 * Get the action URL for the record.
 * Override with ACTION_URL env var.
 */
function getActionUrl(): string {
  return process.env.ACTION_URL || 'https://metaearth.io';
}

/**
 * Build an OfflineSigner for the given WalletInfo.
 */
async function buildSigner(wallet: WalletInfo): Promise<OfflineSigner> {
  if (wallet.privateKey) {
    const keyBytes = Buffer.from(wallet.privateKey, 'hex');
    return DirectSecp256k1Wallet.fromKey(new Uint8Array(keyBytes), ADDRESS_PREFIX);
  }
  if (wallet.mnemonic) {
    return DirectSecp256k1HdWallet.fromMnemonic(wallet.mnemonic, { prefix: ADDRESS_PREFIX });
  }
  throw new Error(`${wallet.label}: no mnemonic or private key available`);
}

/**
 * Perform a daily check-in (MsgNewRecord) for a single wallet.
 */
export async function performCheckin(
  wallet: WalletInfo,
  network: string = 'mainnet'
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const actionNumber = getActionNumber();
  const actionUrl = getActionUrl();

  log(`Starting check-in for ${wallet.label} (${wallet.address})`);
  log(`  actionNumber: ${actionNumber}`);
  log(`  actionUrl:    ${actionUrl}`);

  const rpcUrl = RPC_ENDPOINTS[network] ?? RPC_ENDPOINTS.mainnet;

  try {
    const signer = await buildSigner(wallet);

    const registry = new Registry();
    registry.register(MSG_TYPE_URL, MsgNewRecordType as any);

    const client = await SigningStargateClient.connectWithSigner(
      rpcUrl,
      signer,
      { registry }
    );

    const msg = {
      typeUrl: MSG_TYPE_URL,
      value: {
        actionNumber,
        actionUrl,
        from: wallet.address,
      },
    };

    // Chain enforces minimum fee of 10,000 umec regardless of gas used.
    // Real on-chain txs use gas_limit=500,000 and pay ~10,000-11,000 umec.
    const fee = {
      amount: [{ denom: 'umec', amount: '12000' }],
      gas: '500000',
    };

    const result = await client.signAndBroadcast(
      wallet.address,
      [msg],
      fee,
      'Daily check-in'
    );

    if (result.code !== 0) {
      const raw = result.rawLog ?? '';
      logError(`${wallet.label} check-in FAILED (code ${result.code}): ${raw}`);
      return { success: false, error: `code ${result.code}: ${raw}` };
    }

    log(`${wallet.label} check-in SUCCESS. TX: ${result.transactionHash}`);
    return { success: true, txHash: result.transactionHash };

  } catch (err: any) {
    const message: string = err?.message ?? String(err);
    logError(`${wallet.label} check-in FAILED: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Run check-in for ALL wallets sequentially.
 */
export async function runCheckinForAll(
  wallets: WalletInfo[],
  network: string = 'mainnet'
): Promise<void> {
  log(`=== Running check-in for ${wallets.length} wallet(s) on ${network} ===`);

  const results: Array<{ wallet: string; success: boolean; error?: string }> = [];

  for (const wallet of wallets) {
    const result = await performCheckin(wallet, network);
    results.push({ wallet: wallet.label, ...result });
    if (wallets.length > 1) await sleep(2000);
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  log(`=== Done: ${succeeded} succeeded, ${failed} failed ===`);

  if (failed > 0) {
    results
      .filter((r) => !r.success)
      .forEach((f) => logError(`Failed: ${f.wallet} — ${f.error}`));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── One-off run ───────────────────────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    require('dotenv').config();
    const { loadAllWallets } = require('./wallet');
    const network = process.env.NETWORK || 'mainnet';
    const wallets = await loadAllWallets();
    await runCheckinForAll(wallets, network);
    process.exit(0);
  })();
}
