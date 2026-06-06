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
 */
const RPC_ENDPOINTS: Record<string, string> = {
  mainnet: 'http://118.175.0.247:16657',
  testnet: 'http://118.175.0.249:26657',
};

const ADDRESS_PREFIX = 'me';
const MSG_CHECKIN_TYPE_URL = '/metaearth.checkin.v1beta1.MsgCheckin';

/**
 * Build a protobufjs Type for MsgCheckin { creator: string }.
 * This satisfies the GeneratedType interface expected by @cosmjs/proto-signing Registry.
 */
function buildMsgCheckinType(): Type {
  const root = new Root();
  const MsgCheckin = new Type('MsgCheckin').add(new Field('creator', 1, 'string'));
  root.add(MsgCheckin);
  return MsgCheckin;
}

const MsgCheckinType = buildMsgCheckinType();

/**
 * Build an OfflineSigner for the given WalletInfo.
 * Supports both mnemonic (BIP44 HD) and raw private key wallets.
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
 * Perform a daily check-in for a single wallet.
 */
export async function performCheckin(
  wallet: WalletInfo,
  network: string = 'mainnet'
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  log(`Starting check-in for ${wallet.label} (${wallet.address})`);

  const rpcUrl = RPC_ENDPOINTS[network] || RPC_ENDPOINTS.mainnet;

  try {
    const signer = await buildSigner(wallet);

    const registry = new Registry();
    registry.register(MSG_CHECKIN_TYPE_URL, MsgCheckinType as any);

    const gasPrice = GasPrice.fromString('0.02ume');
    const client = await SigningStargateClient.connectWithSigner(
      rpcUrl,
      signer,
      { registry, gasPrice }
    );

    const msg = {
      typeUrl: MSG_CHECKIN_TYPE_URL,
      value: { creator: wallet.address },
    };

    const result = await client.signAndBroadcast(
      wallet.address,
      [msg],
      'auto',
      'Daily check-in'
    );

    if (result.code !== 0) {
      const raw = result.rawLog || '';
      if (raw.toLowerCase().includes('already') || raw.toLowerCase().includes('duplicate')) {
        log(`${wallet.label} already checked in today — skipping.`);
        return { success: true, txHash: 'already-checked-in' };
      }
      throw new Error(`Broadcast failed (code ${result.code}): ${raw}`);
    }

    log(`${wallet.label} check-in SUCCESS. TX: ${result.transactionHash}`);
    log(`   Explorer: https://explorer.metaearth.io/tx/${result.transactionHash}`);
    return { success: true, txHash: result.transactionHash };

  } catch (err: any) {
    const message = err?.message || String(err);
    if (
      message.toLowerCase().includes('already') ||
      message.toLowerCase().includes('duplicate') ||
      message.toLowerCase().includes('checkin')
    ) {
      log(`${wallet.label} already checked in today — skipping.`);
      return { success: true, txHash: 'already-checked-in' };
    }
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
