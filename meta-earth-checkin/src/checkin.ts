import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing';
import { SigningStargateClient, GasPrice } from '@cosmjs/stargate';
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

/**
 * MsgCheckin type URL for the x/checkin module.
 * Based on Cosmos SDK convention: /metaearth.checkin.v1beta1.MsgCheckin
 */
const MSG_CHECKIN_TYPE_URL = '/metaearth.checkin.v1beta1.MsgCheckin';

/**
 * Minimal protobuf encoding for MsgCheckin { creator: string }.
 * Field 1, wire type 2 (length-delimited string).
 */
function encodeMsgCheckin(creator: string): Uint8Array {
  const creatorBytes = new TextEncoder().encode(creator);
  const fieldTag = 0x0a; // (field 1 << 3) | wire type 2
  return new Uint8Array([fieldTag, creatorBytes.length, ...creatorBytes]);
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
    const signer = await DirectSecp256k1HdWallet.fromMnemonic(wallet.mnemonic, {
      prefix: ADDRESS_PREFIX,
    });

    const registry = new Registry();
    registry.register(MSG_CHECKIN_TYPE_URL, {
      encode(value: { creator: string }) {
        return encodeMsgCheckin(value.creator);
      },
      decode(data: Uint8Array) {
        const creatorBytes = data.slice(2);
        return { creator: new TextDecoder().decode(creatorBytes) };
      },
      fromJSON(value: any) { return value; },
      toJSON(value: any) { return value; },
      create(value: any) { return value; },
    } as any);

    // 0.02 $ME per gas unit — matches SDK's gas_price constant
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
      if (
        raw.toLowerCase().includes('already') ||
        raw.toLowerCase().includes('duplicate')
      ) {
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
  log(`=== Running check-in for ${wallets.length} wallet(s) ===`);

  const results: Array<{ wallet: string; success: boolean; error?: string }> = [];

  for (const wallet of wallets) {
    const result = await performCheckin(wallet, network);
    results.push({ wallet: wallet.label, ...result });
    if (wallets.length > 1) {
      await sleep(2000);
    }
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

// ── Allow running this file directly for a one-off check-in ──────────────────
if (require.main === module) {
  (async () => {
    require('dotenv').config();
    const { loadMnemonicsFromEnv, importWallets } = require('./wallet');
    const network = process.env.NETWORK || 'mainnet';
    const mnemonics = loadMnemonicsFromEnv();
    const wallets = await importWallets(mnemonics);
    await runCheckinForAll(wallets, network);
    process.exit(0);
  })();
}
