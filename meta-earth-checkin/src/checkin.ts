import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
  OfflineSigner,
} from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import { Type, Field, Root, Writer } from 'protobufjs';
import { log, logError } from './logger';
import { WalletInfo } from './wallet';

// ── Network config (source: openmetaearth/meta-earth-js-sdk config/define.ts) ─
const ROLLUP_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:23011',
  testnet: 'http://118.175.0.249:46657',
};

const ROLLUP_CHAIN_ID: Record<string, string> = {
  mainnet: 'mecheckin_101-1',
  testnet: 'mecheckin_100-1',
};

const ADDRESS_PREFIX = 'me';
const MSG_TYPE_URL = '/stchain.rollapp.checkin.MsgCheckIn';

// Zero-fee — matches openroll ts-client defaultFee pattern
const DEFAULT_FEE = {
  amount: [] as { denom: string; amount: string }[],
  gas: '200000',
};

// ── Protobuf type definition ───────────────────────────────────────────────────
function buildMsgCheckInType(): Type {
  const root = new Root();
  const MsgCheckIn = new Type('MsgCheckIn')
    .add(new Field('checkInAddress', 1, 'string'))
    .add(new Field('checkInMessage', 2, 'string'));
  root.add(MsgCheckIn);
  return MsgCheckIn;
}

const MsgCheckInType = buildMsgCheckInType();

/**
 * Manually encode TxRaw protobuf bytes.
 * TxRaw wire format: 1=body_bytes, 2=auth_info_bytes, 3=signatures[]
 */
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCheckInMessage(): string {
  return process.env.CHECK_IN_MESSAGE || 'META EARTH! ME, My Way!';
}

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

// ── Core check-in function ────────────────────────────────────────────────────

/**
 * Perform a daily check-in (MsgCheckIn) for a single wallet on the rollup chain.
 *
 * Uses Tendermint37Client directly so we can:
 *   1. Build a SigningStargateClient and fetch the live on-chain sequence
 *   2. Sign with explicit signerData (avoids stale auto-fetch inside signAndBroadcast)
 *   3. broadcastTxAsync — bypasses CheckTx fee validation on the rollup
 *      (rollup enforces fees only in CheckTx; DeliverTx accepts zero-fee txs)
 *
 * Zero-fee matches the openroll ts-client defaultFee pattern:
 *   { amount: [], gas: "200000" }
 */
export async function performCheckin(
  wallet: WalletInfo,
  network: string = 'mainnet',
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const checkInMessage = getCheckInMessage();
  const rpcUrl = ROLLUP_RPC[network] ?? ROLLUP_RPC.mainnet;
  const chainId = ROLLUP_CHAIN_ID[network] ?? ROLLUP_CHAIN_ID.mainnet;

  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  message : ${checkInMessage}`);
  log(`  chain   : ${chainId}`);
  log(`  rpc     : ${rpcUrl}`);

  try {
    const signer = await buildSigner(wallet);

    const registry = new Registry();
    registry.register(MSG_TYPE_URL, MsgCheckInType as any);

    // Use Tendermint37Client so we hold the handle for broadcastTxAsync
    const tmClient = await Tendermint37Client.connect(rpcUrl);
    const client = await SigningStargateClient.createWithSigner(tmClient, signer, { registry });

    // Fetch live on-chain sequence — avoids stale auto-fetch inside signAndBroadcast
    let accountNumber = 0;
    let sequence = 0;
    try {
      const acct = await client.getSequence(wallet.address);
      accountNumber = acct.accountNumber;
      sequence = acct.sequence;
      log(`${wallet.label}: accountNumber=${accountNumber}, sequence=${sequence}`);
    } catch {
      log(`${wallet.label}: account not found on rollup — using accountNumber=0, sequence=0`);
    }

    const msg = {
      typeUrl: MSG_TYPE_URL,
      value: MsgCheckInType.fromObject({
        checkInAddress: wallet.address,
        checkInMessage,
      }),
    };

    // Sign with explicit signerData, then broadcast async
    const signerData = { accountNumber, sequence, chainId };
    const signed = await client.sign(wallet.address, [msg], DEFAULT_FEE, checkInMessage, signerData);
    const txBytes = encodeTxRaw(signed);

    log(`${wallet.label}: broadcasting check-in tx (async)...`);
    const asyncRes = await tmClient.broadcastTxAsync({ tx: txBytes });
    const txHash = Buffer.from(asyncRes.hash).toString('hex').toUpperCase();

    log(`${wallet.label} check-in submitted. TX: ${txHash}`);
    return { success: true, txHash };

  } catch (err: any) {
    const message: string = err?.message ?? String(err);
    logError(`${wallet.label} check-in FAILED: ${message}`);
    return { success: false, error: message };
  }
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
