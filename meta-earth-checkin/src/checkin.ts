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
// NEW rollup mecheckin_401-1 at 118.175.0.249:46657 — ALIVE, produces blocks.
//   Uses /stchain.rollapp.checkin.MsgCheckIn (confirmed by live testing 2026-06-13).
//   /mechain.checkin.MsgCheckIn is in the GitHub proto but NOT deployed on chain (code 2).
// OLD rollup mecheckin_101-1 at 118.175.0.247:23011 — dead since 2026-05-01. Fallback only.
// NEW hub mechain_400-1 at 118.175.0.249:26657 — has IBC channel-1 → new rollup channel-0.
//   Wallet faucet/genesis tokens live here. IBC-bridge creates rollup account automatically.
// JS SDK config: repos/meta-earth-js-sdk/src/config/define.ts
const NEW_ROLLUP_RPC   = 'http://118.175.0.249:46657';
const OLD_ROLLUP_RPC   = 'http://118.175.0.247:23011';
const OLD_ROLLUP_CHAIN = 'mecheckin_101-1';
const NEW_HUB_RPC      = 'http://118.175.0.249:26657';
const NEW_HUB_REST     = 'http://118.175.0.249:1317';
const IBC_HUB_CHANNEL  = 'channel-1';   // new hub channel-1 → new rollup channel-0 (STATE_OPEN)
const IBC_BRIDGE_UMEC  = 10_000;         // tiny bridge amount — just enough to create rollup account
const ADDRESS_PREFIX   = 'me';

// Both rollups use the same type URL and fields.
// /mechain.checkin.MsgCheckIn is NOT registered on any live chain — code 2 if tried.
const CHECKIN_TYPE_URL = '/stchain.rollapp.checkin.MsgCheckIn';

// Per-chain fee (JS SDK: gas_max_set = '500000', no min gas price on new rollup):
const NEW_ROLLUP_FEE = { amount: [] as { denom: string; amount: string }[], gas: '500000' };
const OLD_ROLLUP_FEE = { amount: [{ denom: 'umec', amount: '500' }], gas: '500000' };

// ── Protobuf type (both rollups: creator/slogan/recoverInterruption) ───────────
// Source: live mempool inspection — stchain.rollapp.checkin.MsgCheckIn
// Pattern: protobufjs/minimal _m0.Writer (GeneratedType-compatible, like openroll ts-client)
interface MsgCheckIn { creator: string; slogan: string; recoverInterruption: boolean; }

const MsgCheckInType = {
  encode(msg: MsgCheckIn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (msg.creator !== '')           writer.uint32(10).string(msg.creator);
    if (msg.slogan  !== '')           writer.uint32(18).string(msg.slogan);
    if (msg.recoverInterruption)      writer.uint32(24).bool(msg.recoverInterruption);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): MsgCheckIn {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const msg: MsgCheckIn = { creator: '', slogan: '', recoverInterruption: false };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: msg.creator             = reader.string(); break;
        case 2: msg.slogan              = reader.string(); break;
        case 3: msg.recoverInterruption = reader.bool();   break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return msg;
  },
  fromPartial(obj: Partial<MsgCheckIn>): MsgCheckIn {
    return {
      creator:             obj.creator             ?? '',
      slogan:              obj.slogan              ?? '',
      recoverInterruption: obj.recoverInterruption ?? false,
    };
  },
};

// ── TxRaw encoder (for old dead rollup broadcastTxSync path) ──────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildSigner(wallet: WalletInfo): Promise<OfflineSigner> {
  if (wallet.privateKey) {
    return DirectSecp256k1Wallet.fromKey(Buffer.from(wallet.privateKey, 'hex'), ADDRESS_PREFIX);
  }
  if (wallet.mnemonic) {
    return DirectSecp256k1HdWallet.fromMnemonic(wallet.mnemonic, { prefix: ADDRESS_PREFIX });
  }
  throw new Error(`${wallet.label}: no credentials (no mnemonic or private key)`);
}

function buildRegistry(): Registry {
  const reg = new Registry([...defaultRegistryTypes]);
  reg.register(CHECKIN_TYPE_URL, MsgCheckInType as any);
  return reg;
}

function parseExpectedSequence(logMsg: string): number | null {
  const m = logMsg.match(/expected\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

async function fetchChainId(rpc: string): Promise<string> {
  const res = await fetch(`${rpc.replace(/\/$/, '')}/status`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`/status HTTP ${res.status}`);
  const data = await res.json() as any;
  return data?.result?.node_info?.network as string;
}

// ── Auto IBC bridge: hub → rollup (creates rollup account when missing) ───────
// A wallet needs an account on the new rollup before it can check in.
// If hub (mechain_400-1) has umec, bridge a tiny amount via IBC channel-1 to
// create the rollup account automatically, then retry check-in.
async function autoIbcBridgeToRollup(wallet: WalletInfo): Promise<boolean> {
  try {
    const res = await fetch(
      `${NEW_HUB_REST}/cosmos/bank/v1beta1/balances/${wallet.address}`,
      { signal: AbortSignal.timeout(8000) },
    );
    const json = await res.json() as any;
    const umec = (json.balances ?? []).find((b: any) => b.denom === 'umec');
    const hubBalance = umec ? parseInt(umec.amount, 10) : 0;

    const needed = IBC_BRIDGE_UMEC + 10_000; // bridge + hub tx fee (10000 umec)
    if (hubBalance < needed) {
      log(`${wallet.label}: new hub balance ${hubBalance} umec (need ${needed} for IBC bridge)`);
      return false;
    }

    log(`${wallet.label}: hub has ${hubBalance} umec — bridging ${IBC_BRIDGE_UMEC} umec to rollup via IBC…`);
    const signer  = await buildSigner(wallet);
    const client  = await SigningStargateClient.connectWithSigner(NEW_HUB_RPC, signer, { registry: buildRegistry() });
    const timeout = BigInt(Date.now() + 10 * 60_000) * 1_000_000n;
    const hubFee  = { amount: [{ denom: 'umec', amount: '10000' }], gas: '500000' };

    const result = await (client as any).sendIbcTokens(
      wallet.address,
      wallet.address,
      { denom: 'umec', amount: String(IBC_BRIDGE_UMEC) },
      'transfer',
      IBC_HUB_CHANNEL,
      undefined,
      timeout,
      hubFee,
      'Auto-bridge to activate rollup account',
    );

    if (result.code !== 0) {
      log(`${wallet.label}: IBC bridge failed (code ${result.code}): ${result.rawLog ?? ''}`);
      return false;
    }

    log(`${wallet.label}: IBC bridge sent. TX: ${result.transactionHash}`);
    return true;
  } catch (e: any) {
    log(`${wallet.label}: IBC bridge error: ${e?.message ?? e}`);
    return false;
  }
}

// ── NEW rollup path: signAndBroadcast (waits for actual block confirmation) ───
// The official pattern from openroll ts-client and meta-earth-js-sdk:
//   SigningStargateClient.connectWithSigner + signAndBroadcast
// This auto-fetches account sequence, broadcasts, then polls until DeliverTx.
// Only works on an ALIVE chain (new rollup is alive and producing blocks).
async function checkinOnNewRollup(
  wallet: WalletInfo,
  rpc: string,
  chainId: string,
  slogan: string,
): Promise<{ success: boolean; txHash?: string; chain?: string; error?: string } | null> {
  const signer   = await buildSigner(wallet);
  const registry = buildRegistry();

  // connectWithSigner: opens WebSocket to RPC, registers types, builds signing client.
  // This is the same approach used in openroll ts-client module.ts (sendMsgSetClientId).
  const client = await SigningStargateClient.connectWithSigner(rpc, signer, { registry });

  // Quick account check — avoids waiting for a full signAndBroadcast round-trip
  // only to get code 9 (account not found) from DeliverTx.
  try {
    await client.getSequence(wallet.address);
  } catch (e: any) {
    const msg = e?.message ?? '';
    if (msg.includes('does not exist') || msg.includes('not found')) {
      log(`${wallet.label}: no account on ${chainId}. Get tokens at https://www.mec.me/en-US/faucet`);
      return null;
    }
    throw e;
  }

  const checkInMsg = {
    typeUrl: CHECKIN_TYPE_URL,
    value:   MsgCheckInType.fromPartial({ creator: wallet.address, slogan, recoverInterruption: false }),
  };

  // signAndBroadcast: fetches sequence automatically, signs, broadcasts, polls for DeliverTx.
  // Returns DeliverTxResponse with transactionHash + code once tx is included in a block.
  const result = await client.signAndBroadcast(wallet.address, [checkInMsg], NEW_ROLLUP_FEE);

  if (result.code !== 0) {
    if (result.code === 1101) {
      log(`${wallet.label}: KYC not registered. Create a Meta Earth account and link this wallet at https://www.mec.me`);
      return { success: false, error: `Not a KYC user — register your wallet in the Meta Earth app at https://www.mec.me` };
    }
    if (result.code === 1108) {
      return { success: false, error: `Invalid slogan (code 1108) — set CHECK_IN_MESSAGE env var to a valid value` };
    }
    return { success: false, error: `DeliverTx code ${result.code}: ${result.rawLog ?? ''}` };
  }

  log(`${wallet.label}: ✓ check-in CONFIRMED on ${chainId}. TX: ${result.transactionHash}`);
  return { success: true, txHash: result.transactionHash, chain: chainId };
}

// ── OLD rollup path: broadcastTxSync (dead chain — just mempool submission) ───
// Old rollup has been dead since 2026-05-01 (no blocks).  signAndBroadcast would
// timeout waiting for DeliverTx that never arrives, so we only do CheckTx here.
// Code 0 from CheckTx means the tx was accepted into mempool (but won't confirm).
async function checkinOnOldRollup(
  wallet: WalletInfo,
  slogan: string,
): Promise<{ success: boolean; txHash?: string; chain?: string; error?: string }> {
  const signer   = await buildSigner(wallet);
  const registry = buildRegistry();

  const tmClient = await Tendermint37Client.connect(OLD_ROLLUP_RPC);
  const client   = await SigningStargateClient.createWithSigner(tmClient, signer, { registry });

  let accountNumber = 0;
  let sequence = 0;
  try {
    const acct = await client.getSequence(wallet.address);
    accountNumber = acct.accountNumber;
    sequence      = acct.sequence;
  } catch (e: any) {
    const msg = e?.message ?? '';
    if (msg.includes('does not exist') || msg.includes('not found')) {
      accountNumber = 0; sequence = 0; // Try anyway; fallback chain may auto-create
    } else {
      throw e;
    }
  }

  const checkInMsg = {
    typeUrl: CHECKIN_TYPE_URL,
    value:   MsgCheckInType.fromPartial({ creator: wallet.address, slogan, recoverInterruption: false }),
  };

  async function trySync(seq: number) {
    const signed   = await client.sign(wallet.address, [checkInMsg], OLD_ROLLUP_FEE, '', {
      accountNumber, sequence: seq, chainId: OLD_ROLLUP_CHAIN,
    });
    const txBytes  = encodeTxRaw(signed);
    const res      = await (tmClient as any).broadcastTxSync({ tx: txBytes });
    return {
      code:   res.code ?? 0,
      logMsg: res.log  ?? '',
      hash:   Buffer.from(res.hash).toString('hex').toUpperCase(),
    };
  }

  let result = await trySync(sequence);

  // Code 32 = sequence mismatch — mempool has a pending tx at a different sequence.
  if (result.code === 32) {
    const expected = parseExpectedSequence(result.logMsg);
    if (expected !== null && expected !== sequence) {
      log(`${wallet.label}: sequence mismatch on old rollup (expected ${expected}), retrying…`);
      result = await trySync(expected);
    }
  }

  if (result.code === 9 && result.logMsg.includes('does not exist')) {
    return { success: false, error: 'Wallet not activated. Get testnet tokens at https://www.mec.me/en-US/faucet' };
  }

  if (result.code !== 0) {
    return { success: false, error: `Old rollup CheckTx code ${result.code}: ${result.logMsg}` };
  }

  log(`${wallet.label} ✓ old rollup mempool accepted (chain dead — tx won't confirm). TX: ${result.hash}`);
  return { success: true, txHash: result.hash, chain: OLD_ROLLUP_CHAIN };
}

// ── Main check-in entry point ─────────────────────────────────────────────────

export async function performCheckin(
  wallet: WalletInfo,
  network = 'mainnet',
): Promise<{ success: boolean; txHash?: string; chain?: string; error?: string }> {
  const slogan = process.env.CHECK_IN_MESSAGE ?? 'META EARTH! ME, My Way!';

  log(`Starting check-in for ${wallet.label} (${wallet.address})`);
  log(`  slogan: ${slogan}`);

  try {
    // ── Step 1: Try NEW rollup — signAndBroadcast → real block confirmation ──
    let newChainId = '';
    try {
      newChainId = await fetchChainId(NEW_ROLLUP_RPC);
      log(`  NEW rollup: ${newChainId} @ ${NEW_ROLLUP_RPC}`);
    } catch (e: any) {
      log(`  NEW rollup unreachable (${e?.message}), falling back to old rollup.`);
    }

    if (newChainId) {
      let result = await checkinOnNewRollup(wallet, NEW_ROLLUP_RPC, newChainId, slogan);

      // No rollup account — try auto-IBC bridge from new hub, then retry once
      if (result === null) {
        log(`  ${wallet.label}: no rollup account. Attempting IBC bridge from hub…`);
        const bridged = await autoIbcBridgeToRollup(wallet);
        if (bridged) {
          log(`  Waiting 30s for IBC packet to arrive on rollup…`);
          await new Promise(r => setTimeout(r, 30_000));
          result = await checkinOnNewRollup(wallet, NEW_ROLLUP_RPC, newChainId, slogan);
        }
      }

      if (result !== null) {
        if (result.success) {
          log(`${wallet.label} ✓ check-in CONFIRMED on ${newChainId}. TX: ${result.txHash}`);
        }
        return result;
      }
      log(`  ${wallet.label}: still no rollup account after bridge attempt. Falling back to old rollup.`);
    }

    // ── Step 2: Old rollup fallback — broadcastTxSync (dead chain, CheckTx only) ──
    log(`  Trying OLD rollup (${OLD_ROLLUP_CHAIN}) — dead since 2026-05-01, tx won't confirm`);
    return await checkinOnOldRollup(wallet, slogan);

  } catch (err: any) {
    logError(`${wallet.label} check-in error`, err);
    return { success: false, error: err?.message ?? String(err) };
  }
}

// ── Batch runner ──────────────────────────────────────────────────────────────

export async function runCheckinForAll(
  wallets: WalletInfo[],
  network = 'mainnet',
): Promise<void> {
  log(`=== Daily check-in for ${wallets.length} wallet(s) ===`);

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
    if (wallets.length > 1) await new Promise(r => setTimeout(r, 2000));
  }

  const succeeded = results.filter(r => r.success).length;
  const failed    = results.filter(r => !r.success).length;
  log(`=== Done: ${succeeded} succeeded, ${failed} failed ===`);

  if (failed > 0) {
    results.filter(r => !r.success).forEach(f =>
      logError(`  Failed: ${f.wallet} — ${f.error}`)
    );
  }
}

// ── Direct invocation (checkin-now script) ────────────────────────────────────
const _isMain = (process.argv[1] ?? '').match(/checkin\.[jt]s$/);

if (_isMain) {
  (async () => {
    const { loadAllWallets } = await import('./wallet');
    const wallets = await loadAllWallets();
    const network = process.env.NETWORK ?? 'mainnet';
    await runCheckinForAll(wallets, network);
    process.exit(0);
  })().catch(err => {
    console.error('checkin-now failed:', err);
    process.exit(1);
  });
}
