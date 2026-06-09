import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
  OfflineSigner,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import { Type, Field, Root, Writer } from 'protobufjs';
import { log, logError } from './logger';
import { WalletInfo } from './wallet';

// ── Hub chain config ──────────────────────────────────────────────────────────
//
// Active check-in: MsgNewRecord in the metaearth.wstaking module on me-chain hub.
// Confirmed from dashboard/server/blockchain.ts and live chain activity (9 000+ txs/day).
//
// The rollup (mecheckin_101-1) has been stalled since 2026-05-01.
// NOTE: mechain.checkin.MsgCheckIn (openmetaearth/meta-earth repo) is a DIFFERENT,
// currently inactive module — do NOT use that type URL.
//
const HUB_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:16657',
  testnet: 'http://118.175.0.249:26657',
};

const ROLLUP_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:23011',
  testnet: 'http://118.175.0.249:46657',
};

const ROLLUP_CHAIN_ID: Record<string, string> = {
  mainnet: 'mecheckin_101-1',
  testnet: 'mecheckin_100-1',
};

const ADDRESS_PREFIX = 'me';

// Hub wstaking check-in: MsgNewRecord
//   actionNumber: alphanumeric identifier, unique per day (keeper validates alphanumeric only)
//   actionUrl:    non-empty URL (keeper validates non-empty only)
//   from:         wallet address
const WSTAKING_NEW_RECORD_URL = '/metaearth.wstaking.MsgNewRecord';

// Rollup fallback: MsgCheckIn (stalled since 2026-05-01, kept in case it resumes)
const ROLLUP_CHECKIN_URL = '/stchain.rollapp.checkin.MsgCheckIn';

// Hub: chain enforces a flat minimum of 10 000 umec (regardless of gas price).
// Use 11 000 umec / 500 000 gas for a safe margin.
const HUB_CHECKIN_FEE = {
  amount: [{ denom: 'umec', amount: '11000' }],
  gas: '500000',
};
const HUB_CHECKIN_MIN_UMEC = 11_000;

// Rollup: zero fee — fee_checker.go only enforces fees during CheckTx.
// Use broadcastTxAsync to bypass CheckTx entirely.
const ROLLUP_FEE = {
  amount: [] as { denom: string; amount: string }[],
  gas: '200000',
};

const HUB_REST: Record<string, string> = {
  mainnet: 'http://118.175.0.247:11317',
  testnet: 'http://118.175.0.249:1317',
};

// ── Protobuf types ────────────────────────────────────────────────────────────

// MsgNewRecord — metaearth.wstaking module (hub chain active check-in)
function buildMsgNewRecordType(): Type {
  const root = new Root();
  const T = new Type('MsgNewRecord')
    .add(new Field('actionNumber', 1, 'string'))
    .add(new Field('actionUrl', 2, 'string'))
    .add(new Field('from', 3, 'string'));
  root.add(T);
  return T;
}
const MsgNewRecordType = buildMsgNewRecordType();

// MsgCheckIn — rollup fallback (2 fields only)
function buildMsgCheckInType(): Type {
  const root = new Root();
  const T = new Type('MsgCheckIn')
    .add(new Field('checkInAddress', 1, 'string'))
    .add(new Field('checkInMessage', 2, 'string'));
  root.add(T);
  return T;
}
const MsgCheckInType = buildMsgCheckInType();

function encodeTxRaw(txRaw: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: Uint8Array[];
}): Uint8Array {
  const w = new Writer();
  if (txRaw.bodyBytes?.length) w.uint32(10).bytes(txRaw.bodyBytes);
  if (txRaw.authInfoBytes?.length) w.uint32(18).bytes(txRaw.authInfoBytes);
  for (const sig of txRaw.signatures ?? []) w.uint32(26).bytes(sig);
  return w.finish();
}

// ── Signer builders ───────────────────────────────────────────────────────────

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

async function buildHubClient(wallet: WalletInfo): Promise<SigningStargateClient> {
  const signer = await buildSigner(wallet);
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(WSTAKING_NEW_RECORD_URL, MsgNewRecordType as any);
  return SigningStargateClient.connectWithSigner(HUB_RPC.mainnet, signer, {
    registry,
    prefix: ADDRESS_PREFIX,
  });
}

// ── Hub balance check ──────────────────────────────────────────────────────────

async function getHubBalance(address: string, network = 'mainnet'): Promise<number> {
  const rest = HUB_REST[network] ?? HUB_REST.mainnet;
  try {
    const res = await fetch(`${rest}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=20`);
    const json = (await res.json()) as any;
    const coin = (json.balances ?? []).find((b: any) => b.denom === 'umec');
    return coin ? parseInt(coin.amount, 10) : 0;
  } catch {
    return 0;
  }
}

// ── Hub check-in (primary) ─────────────────────────────────────────────────────

async function hubCheckin(
  wallet: WalletInfo,
  network = 'mainnet',
): Promise<{ success: boolean; txHash?: string; error?: string; permanent?: boolean }> {
  // Pre-check balance — avoids 2 wasted retries for under-funded wallets.
  const hubBalance = await getHubBalance(wallet.address, network);
  if (hubBalance < HUB_CHECKIN_MIN_UMEC) {
    return {
      success: false,
      error: `Insufficient hub balance: need ${HUB_CHECKIN_MIN_UMEC.toLocaleString()} umec, have ${hubBalance.toLocaleString()} umec — top up to enable check-in`,
      permanent: true,
    };
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // "YYYYMMDD"
  const actionNumber = process.env.CHECKIN_ACTION_NUMBER ?? `MEcheckin${today}`;
  const actionUrl = process.env.CHECKIN_URL ?? 'https://metaearth.network';

  log(`${wallet.label}: hub check-in`);
  log(`  actionNumber : ${actionNumber}`);
  log(`  actionUrl    : ${actionUrl}`);
  log(`  from         : ${wallet.address}`);
  log(`  fee          : ${HUB_CHECKIN_FEE.amount[0].amount} umec / ${HUB_CHECKIN_FEE.gas} gas`);

  const client = await buildHubClient(wallet);
  const msg = {
    typeUrl: WSTAKING_NEW_RECORD_URL,
    value: MsgNewRecordType.fromObject({ actionNumber, actionUrl, from: wallet.address }),
  };

  const result = await client.signAndBroadcast(wallet.address, [msg], HUB_CHECKIN_FEE, '');
  if (result.code !== 0) {
    return {
      success: false,
      error: `code ${result.code}: ${(result.rawLog ?? 'unknown error').slice(0, 200)}`,
    };
  }
  return { success: true, txHash: result.transactionHash };
}

// ── Rollup fallback (stalled since 2026-05-01) ────────────────────────────────

async function rollupCheckin(
  wallet: WalletInfo,
  network = 'mainnet',
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const rpc = ROLLUP_RPC[network] ?? ROLLUP_RPC.mainnet;
    const chainId = ROLLUP_CHAIN_ID[network] ?? ROLLUP_CHAIN_ID.mainnet;
    const signer = await buildSigner(wallet);

    const registry = new Registry([...defaultRegistryTypes]);
    registry.register(ROLLUP_CHECKIN_URL, MsgCheckInType as any);

    const tmClient = await Tendermint37Client.connect(rpc);
    const client = await SigningStargateClient.createWithSigner(tmClient, signer, { registry });

    let accountNumber = 0;
    let sequence = 0;
    try {
      const acct = await client.getSequence(wallet.address);
      accountNumber = acct.accountNumber;
      sequence = acct.sequence;
    } catch {
      return {
        success: false,
        error: 'Account not found on chain — wallet must receive tokens to activate before it can check in',
      };
    }

    const checkInMessage = process.env.CHECK_IN_MESSAGE || 'META EARTH! ME, My Way!';
    const msg = {
      typeUrl: ROLLUP_CHECKIN_URL,
      value: MsgCheckInType.fromObject({ checkInAddress: wallet.address, checkInMessage }),
    };

    const signed = await client.sign(wallet.address, [msg], ROLLUP_FEE, checkInMessage, {
      accountNumber,
      sequence,
      chainId,
    });
    const txBytes = encodeTxRaw(signed);
    const res = await tmClient.broadcastTxAsync({ tx: txBytes });
    const txHash = Buffer.from(res.hash).toString('hex').toUpperCase();
    return { success: true, txHash };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// ── Core check-in function ────────────────────────────────────────────────────

/**
 * Perform a daily check-in for a single wallet.
 *
 * Primary: MsgNewRecord on the me-chain hub (metaearth.wstaking module).
 *          This is the ACTIVE check-in system (confirmed from dashboard + live chain activity).
 *          Requires 11 000+ umec hub balance. Uses signAndBroadcast (standard sync).
 *
 * Fallback: MsgCheckIn on rollup (stalled since 2026-05-01, kept in case it resumes).
 *           Zero fee, broadcastTxAsync to bypass CheckTx fee validation.
 */
export async function performCheckin(
  wallet: WalletInfo,
  network: string = 'mainnet',
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  chain : me-chain hub (metaearth.wstaking.MsgNewRecord)`);
  log(`  rpc   : ${HUB_RPC[network] ?? HUB_RPC.mainnet}`);

  // Primary: hub chain MsgNewRecord
  const hubResult = await hubCheckin(wallet, network);
  if (hubResult.success) {
    log(`${wallet.label} check-in SUCCESS. TX: ${hubResult.txHash}`);
    return hubResult;
  }

  logError(`${wallet.label} hub check-in FAILED: ${hubResult.error}`);

  // Fallback: rollup MsgCheckIn (stalled — expected to also fail)
  log(`${wallet.label}: trying rollup fallback...`);
  const rollupResult = await rollupCheckin(wallet, network);
  if (rollupResult.success) {
    log(`${wallet.label} check-in via rollup fallback. TX: ${rollupResult.txHash}`);
    return rollupResult;
  }

  logError(`${wallet.label} rollup fallback FAILED: ${rollupResult.error}`);
  return {
    success: false,
    error: `Hub: ${hubResult.error} | Rollup: ${rollupResult.error}`,
  };
}

// ── Batch runner ──────────────────────────────────────────────────────────────

/**
 * Run check-in for ALL configured wallets sequentially.
 */
export async function runCheckinForAll(
  wallets: WalletInfo[],
  network: string = 'mainnet',
): Promise<void> {
  log(`=== Daily check-in for ${wallets.length} wallet(s) on ${network} ===`);

  const results: Array<{ wallet: string; success: boolean; txHash?: string; error?: string }> = [];

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
      .forEach((f) => logError(`  Failed: ${f.wallet} — ${f.error}`));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
