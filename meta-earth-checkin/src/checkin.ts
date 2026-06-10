import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
  OfflineSigner,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';
import { Type, Field, Root } from 'protobufjs';
import { log, logError } from './logger';
import { WalletInfo } from './wallet';

// ── Chain config ───────────────────────────────────────────────────────────────
// The rollup chain (mecheckin_101-1) stopped producing blocks on 2026-05-01.
// All daily check-ins now go to the HUB chain (me-chain) via MsgNewRecord.
const HUB_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:16657',
  testnet: 'http://118.175.0.249:26657',
};
const HUB_CHAIN_ID: Record<string, string> = {
  mainnet: 'me-chain',
  testnet: 'me-chain',
};
const ADDRESS_PREFIX = 'me';

// ── /metaearth.wstaking.MsgNewRecord ─────────────────────────────────────────
// This is the ACTIVE daily check-in on the hub chain. Confirmed from live txs:
//   actionNumber: "MEcheckin20260610"  (MEcheckin + YYYYMMDD — changes each day)
//   actionUrl:    "https://metaearth.network"
//   from:         wallet address
//
// Source: repos/me-hub/x/wstaking/keeper/msg_server_record.go
//         repos/meta-earth-js-sdk/src/me-client-ts/metaearth.wstaking/
//
// Fee: 10 000 umec, gas 500 000 (confirmed from real on-chain txs)
// Broadcast: signAndBroadcast — hub produces blocks, tx is confirmed on-chain.
const NEW_RECORD_TYPE_URL = '/metaearth.wstaking.MsgNewRecord';

const CHECKIN_URL = process.env.CHECKIN_URL ?? 'https://metaearth.network';

// Fee confirmed from live check-in txs on me-chain
const HUB_FEE = {
  amount: [{ denom: 'umec', amount: '10000' }],
  gas: '500000',
};

// ── Protobuf type (MsgNewRecord — 3 fields) ───────────────────────────────────
function buildMsgNewRecordType(): Type {
  const root = new Root();
  const T = new Type('MsgNewRecord')
    .add(new Field('actionNumber', 1, 'string'))
    .add(new Field('actionUrl',    2, 'string'))
    .add(new Field('from',         3, 'string'));
  root.add(T);
  return T;
}
const MsgNewRecordType = buildMsgNewRecordType();

// ── Action number: "MEcheckin" + YYYYMMDD ─────────────────────────────────────
// Confirmed from live check-in txs. Each day gets a new action number.
function getTodayActionNumber(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `MEcheckin${y}${m}${d}`;
}

// ── Signer builder ────────────────────────────────────────────────────────────
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

// ── Check-in ──────────────────────────────────────────────────────────────────

export async function performCheckin(
  wallet: WalletInfo,
  network = 'mainnet',
): Promise<{ success: boolean; txHash?: string; error?: string; note?: string }> {
  const rpc      = HUB_RPC[network]     ?? HUB_RPC.mainnet;
  const chainId  = HUB_CHAIN_ID[network] ?? HUB_CHAIN_ID.mainnet;
  const actionNumber = getTodayActionNumber();

  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  chain    : ${chainId} (hub — active, producing blocks)`);
  log(`  typeUrl  : ${NEW_RECORD_TYPE_URL}`);
  log(`  action   : ${actionNumber}`);
  log(`  url      : ${CHECKIN_URL}`);
  log(`  rpc      : ${rpc}`);
  log(`  fee      : 10000 umec, gas 500000`);

  try {
    const signer = await buildSigner(wallet);
    const registry = new Registry([...defaultRegistryTypes]);
    registry.register(NEW_RECORD_TYPE_URL, MsgNewRecordType as any);

    const client = await SigningStargateClient.connectWithSigner(rpc, signer, {
      registry,
      prefix: ADDRESS_PREFIX,
    });

    const msg = {
      typeUrl: NEW_RECORD_TYPE_URL,
      value: MsgNewRecordType.fromObject({
        actionNumber,
        actionUrl: CHECKIN_URL,
        from: wallet.address,
      }),
    };

    const result = await client.signAndBroadcast(wallet.address, [msg], HUB_FEE, '');

    if (result.code !== 0) {
      return {
        success: false,
        error: `TX failed with code ${result.code}: ${result.rawLog ?? ''}`,
      };
    }

    log(`${wallet.label} check-in confirmed on-chain. TX: ${result.transactionHash}`);
    return { success: true, txHash: result.transactionHash };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// ── Batch runner ──────────────────────────────────────────────────────────────

export async function runCheckinForAll(
  wallets: WalletInfo[],
  network = 'mainnet',
): Promise<void> {
  log(`=== Daily check-in for ${wallets.length} wallet(s) on ${network} ===`);

  const results: Array<{
    wallet: string;
    success: boolean;
    txHash?: string;
    error?: string;
  }> = [];

  for (const wallet of wallets) {
    const result = await performCheckin(wallet, network);
    results.push({ wallet: wallet.label, ...result });
    if (wallets.length > 1) await sleep(2000);
  }

  const succeeded = results.filter(r => r.success).length;
  const failed    = results.filter(r => !r.success).length;
  log(`=== Done: ${succeeded} succeeded, ${failed} failed ===`);

  if (failed > 0) {
    results
      .filter(r => !r.success)
      .forEach(f => logError(`  Failed: ${f.wallet} — ${f.error}`));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
