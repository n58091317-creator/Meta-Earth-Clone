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

// ── Chain config ───────────────────────────────────────────────────────────────
// Official check-in rollup: mecheckin_400-1 (confirmed by Meta Earth team 2026-06-13).
//   SDK config points to 118.175.0.249:46657. Chain may report mecheckin_401-1 at
//   runtime (use dynamic chain ID fetch to always sign with the real chain's ID).
// OLD rollup (mecheckin_101-1): dead, no blocks since 2026-05-01. Used as fallback.
// New wallets need testnet tokens from https://www.mec.me/en-US/faucet first.
const NEW_ROLLUP_RPC    = 'http://118.175.0.249:46657';
const OLD_ROLLUP_RPC    = 'http://118.175.0.247:23011';
const OLD_ROLLUP_CHAIN  = 'mecheckin_101-1';
const ADDRESS_PREFIX = 'me';

// ── Check-in type ──────────────────────────────────────────────────────────────
// Confirmed by Meta Earth technical team (2026-06-13):
//   Type URL is /mechain.checkin.MsgCheckIn on the rollup (mecheckin_400-1).
//   Source: repos/meta-earth/proto/mechain/checkin/tx.proto
// Fields: checkInAddress (1), checkInMessage (2), checkInTimezone (3).
// DO NOT use /stchain.rollapp.checkin.MsgCheckIn (wrong module).
// DO NOT use /metaearth.wstaking.MsgNewRecord (Show E — different task entirely).
const CHECKIN_TYPE_URL = '/mechain.checkin.MsgCheckIn';

function buildMsgCheckInType(): Type {
  const root = new Root();
  const T = new Type('MsgCheckIn')
    .add(new Field('checkInAddress', 1, 'string'))
    .add(new Field('checkInMessage', 2, 'string'))
    .add(new Field('checkInTimezone', 3, 'string'));
  root.add(T);
  return T;
}
const MsgCheckInType = buildMsgCheckInType();

/** Fetch the actual chain ID from an RPC endpoint's /status. */
async function fetchChainId(rpc: string): Promise<string> {
  const url = rpc.replace(/\/$/, '') + '/status';
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`/status HTTP ${res.status}`);
  const data = await res.json() as any;
  return data?.result?.node_info?.network as string;
}

// Rollup fee: empty amount array with gas 500000 — matches real check-in txs on mecheckin_401-1.
// The rollup's fee_checker.go has no minimum gas price, so zero-fee txs pass CheckTx fine.
// Real bots in the new rollup use empty fee arrays (confirmed from live chain inspection 2026-06-12).
const ROLLUP_FEE = {
  amount: [] as { denom: string; amount: string }[],
  gas: '500000',
};

// ── Minimal TxRaw encoder (avoids full protobuf dependency) ───────────────────
function encodeTxRaw(txRaw: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: Uint8Array[];
}): Uint8Array {
  const w = new Writer();
  if (txRaw.bodyBytes?.length)     w.uint32(10).bytes(txRaw.bodyBytes);
  if (txRaw.authInfoBytes?.length) w.uint32(18).bytes(txRaw.authInfoBytes);
  for (const sig of txRaw.signatures ?? []) w.uint32(26).bytes(sig);
  return w.finish();
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

/** Parse "expected N, got M" from a code-32 sequence mismatch log. Returns N or null. */
function parseExpectedSequence(logMsg: string): number | null {
  const m = logMsg.match(/expected\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Check-in on a specific chain. Returns null if the wallet account doesn't exist there. */
async function checkinOnChain(
  wallet: WalletInfo,
  rpc: string,
  chainId: string,
  message: string,
  timezone: string,
): Promise<{ code: number; logMsg: string; hash: string } | null> {
  const signer = await buildSigner(wallet);
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(CHECKIN_TYPE_URL, MsgCheckInType as any);

  const tmClient = await Tendermint37Client.connect(rpc);
  const client = await SigningStargateClient.createWithSigner(tmClient, signer, {
    registry,
    prefix: ADDRESS_PREFIX,
  });

  let accountNumber = 0;
  let sequence = 0;
  try {
    const acct = await client.getSequence(wallet.address);
    accountNumber = acct.accountNumber;
    sequence = acct.sequence;
  } catch (e: any) {
    // Account not found — caller decides whether to fall back
    if (e?.message?.includes('does not exist') || e?.message?.includes('not found')) {
      return null;
    }
    // Other error: re-throw
    throw e;
  }

  const msg = {
    typeUrl: CHECKIN_TYPE_URL,
    value: MsgCheckInType.fromObject({
      checkInAddress:  wallet.address,
      checkInMessage:  message,
      checkInTimezone: timezone,
    }),
  };

  async function tryBroadcast(seq: number): Promise<{ code: number; logMsg: string; hash: string }> {
    const signed = await client.sign(wallet.address, [msg], ROLLUP_FEE, '', {
      accountNumber,
      sequence: seq,
      chainId,
    });
    const txBytes = encodeTxRaw(signed);
    const res = await (tmClient as any).broadcastTxSync({ tx: txBytes });
    const code = res.code ?? 0;
    const logMsg = res.log ?? '';

    // Code 9 = account doesn't exist (fee payer check) — signal caller to fall back
    if (code === 9 && logMsg.includes('does not exist')) {
      return { code, logMsg, hash: '' };
    }
    return {
      code,
      logMsg,
      hash: Buffer.from(res.hash).toString('hex').toUpperCase(),
    };
  }

  // Attempt with on-chain sequence
  let result = await tryBroadcast(sequence);

  // Code 32 = sequence mismatch (mempool has pending tx at this seq, common on old dead rollup).
  // Parse the expected sequence and retry once.
  if (result.code === 32) {
    const expected = parseExpectedSequence(result.logMsg);
    if (expected !== null && expected !== sequence) {
      log(`${wallet.label} sequence mismatch — on-chain: ${sequence}, mempool expects: ${expected}. Retrying...`);
      result = await tryBroadcast(expected);
    }
  }

  return result;
}

export async function performCheckin(
  wallet: WalletInfo,
  network = 'mainnet',
): Promise<{ success: boolean; txHash?: string; chain?: string; error?: string }> {
  const message  = process.env.CHECK_IN_MESSAGE  ?? 'META EARTH! ME, My Way!';
  const timezone = process.env.CHECK_IN_TIMEZONE ?? 'UTC';

  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  typeUrl  : ${CHECKIN_TYPE_URL}`);
  log(`  message  : ${message}`);
  log(`  timezone : ${timezone}`);

  try {
    // ── Step 1: Fetch the NEW rollup's actual chain ID from its /status ────────
    let newRollupChain: string;
    try {
      newRollupChain = await fetchChainId(NEW_ROLLUP_RPC);
      log(`  NEW rollup chain ID: ${newRollupChain} @ ${NEW_ROLLUP_RPC}`);
    } catch (e: any) {
      log(`  NEW rollup unreachable (${e?.message}), falling back to old rollup.`);
      newRollupChain = '';
    }

    if (newRollupChain) {
      let result = await checkinOnChain(wallet, NEW_ROLLUP_RPC, newRollupChain, message, timezone);

      if (result === null || (result.code === 9 && result.logMsg.includes('does not exist'))) {
        if (result === null) {
          log(`${wallet.label}: wallet account NOT found on new rollup (${newRollupChain}).`);
        } else {
          log(`${wallet.label}: new rollup rejected tx — account not activated (code 9).`);
        }
        log(`  ⚠️  To activate wallet on new rollup, get testnet tokens from https://www.mec.me/en-US/faucet`);
        log(`  Falling back to OLD rollup: ${OLD_ROLLUP_CHAIN} @ ${OLD_ROLLUP_RPC}`);
      } else {
        if (result.code !== 0) {
          return { success: false, error: `New rollup CheckTx code ${result.code}: ${result.logMsg}` };
        }
        log(`${wallet.label} ✓ check-in accepted by NEW rollup (${newRollupChain}). TX: ${result.hash}`);
        return { success: true, txHash: result.hash, chain: newRollupChain };
      }
    }

    // ── Step 2: Fall back to OLD rollup ───────────────────────────────────────
    const result = await checkinOnChain(wallet, OLD_ROLLUP_RPC, OLD_ROLLUP_CHAIN, message, timezone);

    if (result === null) {
      return {
        success: false,
        error: `Wallet not found on either rollup chain. Activate wallet via https://www.mec.me/en-US/faucet`,
      };
    }

    if (result.code !== 0) {
      return { success: false, error: `Old rollup CheckTx code ${result.code}: ${result.logMsg}` };
    }

    log(`${wallet.label} ✓ check-in accepted by OLD rollup mempool (${OLD_ROLLUP_CHAIN}). TX: ${result.hash}`);
    return { success: true, txHash: result.hash, chain: OLD_ROLLUP_CHAIN };

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
    chain?: string;
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

// ── Direct invocation: run check-in now (used by checkin-now script) ──────────
const _argv1 = process.argv[1] ?? '';
const _isMain = _argv1.endsWith('/checkin.ts') || _argv1.endsWith('/checkin.js');

if (_isMain) {
  (async () => {
    // Dynamic import avoids circular dep issues; dotenv loaded by wallet.ts
    const { loadAllWallets } = await import('./wallet');
    const wallets = await loadAllWallets();
    const network = process.env.NETWORK ?? 'mainnet';
    await runCheckinForAll(wallets, network);
    process.exit(0);
  })().catch((err) => {
    console.error('checkin-now failed:', err);
    process.exit(1);
  });
}
