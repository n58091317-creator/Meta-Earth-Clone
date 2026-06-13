import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
  OfflineSigner,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import _m0 from 'protobufjs/minimal';
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

// ── Check-in proto types (source: repos/meta-earth/proto/mechain/checkin/tx.proto) ──
// NEW rollup: /mechain.checkin.MsgCheckIn
//   Fields: checkInAddress (1), checkInMessage (2), checkInTimezone (3) — all string
// OLD rollup (dead, mecheckin_101-1): /stchain.rollapp.checkin.MsgCheckIn
//   Fields: creator (1), slogan (2), recoverInterruption (3, bool)
//
// DO NOT use /metaearth.wstaking.MsgNewRecord (Show E — completely different task).
//
// GeneratedType-compatible objects using protobufjs/minimal Writer — same pattern
// as repos/meta-earth/ts-client/mechain.checkin/types/mechain/checkin/tx.ts

const NEW_CHECKIN_TYPE_URL = '/mechain.checkin.MsgCheckIn';
const OLD_CHECKIN_TYPE_URL = '/stchain.rollapp.checkin.MsgCheckIn';

interface NewMsgCheckIn { checkInAddress: string; checkInMessage: string; checkInTimezone: string; }
interface OldMsgCheckIn { creator: string; slogan: string; recoverInterruption: boolean; }

const NewMsgCheckInType = {
  encode(message: NewMsgCheckIn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.checkInAddress !== '') writer.uint32(10).string(message.checkInAddress);
    if (message.checkInMessage  !== '') writer.uint32(18).string(message.checkInMessage);
    if (message.checkInTimezone !== '') writer.uint32(26).string(message.checkInTimezone);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): NewMsgCheckIn {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const msg: NewMsgCheckIn = { checkInAddress: '', checkInMessage: '', checkInTimezone: '' };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: msg.checkInAddress = reader.string(); break;
        case 2: msg.checkInMessage = reader.string(); break;
        case 3: msg.checkInTimezone = reader.string(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return msg;
  },
  fromPartial(obj: Partial<NewMsgCheckIn>): NewMsgCheckIn {
    return {
      checkInAddress:  obj.checkInAddress  ?? '',
      checkInMessage:  obj.checkInMessage  ?? '',
      checkInTimezone: obj.checkInTimezone ?? '',
    };
  },
};

const OldMsgCheckInType = {
  encode(message: OldMsgCheckIn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.creator !== '') writer.uint32(10).string(message.creator);
    if (message.slogan  !== '') writer.uint32(18).string(message.slogan);
    if (message.recoverInterruption) writer.uint32(24).bool(message.recoverInterruption);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): OldMsgCheckIn {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const msg: OldMsgCheckIn = { creator: '', slogan: '', recoverInterruption: false };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: msg.creator = reader.string(); break;
        case 2: msg.slogan  = reader.string(); break;
        case 3: msg.recoverInterruption = reader.bool(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return msg;
  },
  fromPartial(obj: Partial<OldMsgCheckIn>): OldMsgCheckIn {
    return {
      creator:             obj.creator             ?? '',
      slogan:              obj.slogan              ?? '',
      recoverInterruption: obj.recoverInterruption ?? false,
    };
  },
};

/** Fetch the actual chain ID from an RPC endpoint's /status. */
async function fetchChainId(rpc: string): Promise<string> {
  const url = rpc.replace(/\/$/, '') + '/status';
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`/status HTTP ${res.status}`);
  const data = await res.json() as any;
  return data?.result?.node_info?.network as string;
}

// Per-chain fee structures (min-gas-price differs between chains):
//   NEW rollup: no minimum gas price → empty fee array is fine
//   OLD rollup: min-gas-price 0.001umec → 0.001 * 500000 = 500umec required
const NEW_ROLLUP_FEE = { amount: [] as { denom: string; amount: string }[], gas: '500000' };
const OLD_ROLLUP_FEE = { amount: [{ denom: 'umec', amount: '500' }], gas: '500000' };

// ── TxRaw encoder using protobufjs/minimal Writer ─────────────────────────────
function encodeTxRaw(txRaw: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: Uint8Array[];
}): Uint8Array {
  const w = _m0.Writer.create();
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

type GeneratedTypeCompat = { encode: (msg: any, writer?: _m0.Writer) => _m0.Writer; decode: (input: any, length?: number) => any; fromPartial: (obj: any) => any; };

/** Check-in on a specific chain. Returns null if the wallet account doesn't exist there. */
async function checkinOnChain(
  wallet: WalletInfo,
  rpc: string,
  chainId: string,
  typeUrl: string,
  msgType: GeneratedTypeCompat,
  msgValue: Record<string, unknown>,
  fee: { amount: { denom: string; amount: string }[]; gas: string },
): Promise<{ code: number; logMsg: string; hash: string } | null> {
  const signer = await buildSigner(wallet);
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(typeUrl, msgType as any);

  const tmClient = await Tendermint37Client.connect(rpc);
  const client = await SigningStargateClient.createWithSigner(tmClient, signer, {
    registry,
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
    typeUrl,
    value: msgType.fromPartial(msgValue),
  };

  async function tryBroadcast(seq: number): Promise<{ code: number; logMsg: string; hash: string }> {
    const signed = await client.sign(wallet.address, [msg], fee, '', {
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
  const message  = process.env.CHECK_IN_MESSAGE  ?? 'ME, My Way!';
  const timezone = process.env.CHECK_IN_TIMEZONE ?? 'UTC';

  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  message  : ${message}`);
  log(`  timezone : ${timezone}`);

  // Both rollups use /stchain.rollapp.checkin.MsgCheckIn (creator, slogan, recoverInterruption).
  // The /mechain.checkin.MsgCheckIn type URL is NOT registered on either live chain.
  // Confirmed by live testing 2026-06-13: new rollup returns code 9 (account not found,
  // type IS parsed) for stchain type, and code 2 (type not registered) for mechain type.
  const msgValue = { creator: wallet.address, slogan: message, recoverInterruption: false };

  try {
    // ── Step 1: Try NEW rollup (mecheckin_401-1) — alive, produces blocks ────────
    let newRollupChain: string;
    try {
      newRollupChain = await fetchChainId(NEW_ROLLUP_RPC);
      log(`  NEW rollup: ${newRollupChain} @ ${NEW_ROLLUP_RPC}`);
    } catch (e: any) {
      log(`  NEW rollup unreachable (${e?.message}), falling back to old rollup.`);
      newRollupChain = '';
    }

    if (newRollupChain) {
      const result = await checkinOnChain(
        wallet, NEW_ROLLUP_RPC, newRollupChain,
        OLD_CHECKIN_TYPE_URL, OldMsgCheckInType, msgValue, NEW_ROLLUP_FEE,
      );

      if (result === null || (result.code === 9 && result.logMsg.includes('does not exist'))) {
        if (result === null) log(`${wallet.label}: wallet NOT found on new rollup (${newRollupChain}).`);
        else                 log(`${wallet.label}: new rollup rejected — account not activated (code 9).`);
        log(`  ⚠️  Get testnet tokens at https://www.mec.me/en-US/faucet`);
        log(`  Falling back to OLD rollup (${OLD_ROLLUP_CHAIN})`);
      } else {
        if (result.code !== 0) {
          return { success: false, error: `New rollup CheckTx code ${result.code}: ${result.logMsg}` };
        }
        log(`${wallet.label} ✓ check-in accepted by NEW rollup (${newRollupChain}). TX: ${result.hash}`);
        return { success: true, txHash: result.hash, chain: newRollupChain };
      }
    }

    // ── Step 2: OLD rollup fallback (dead — no blocks since 2026-05-01) ─────────
    const result = await checkinOnChain(
      wallet, OLD_ROLLUP_RPC, OLD_ROLLUP_CHAIN,
      OLD_CHECKIN_TYPE_URL, OldMsgCheckInType, msgValue, OLD_ROLLUP_FEE,
    );

    if (result === null) {
      return { success: false, error: `Wallet not found on either rollup. Get testnet tokens at https://www.mec.me/en-US/faucet` };
    }
    if (result.code !== 0) {
      return { success: false, error: `Old rollup CheckTx code ${result.code}: ${result.logMsg}` };
    }

    log(`${wallet.label} ✓ check-in accepted by OLD rollup (${OLD_ROLLUP_CHAIN}). TX: ${result.hash}`);
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
