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
// Daily check-in goes to the ROLLUP chain via broadcastTxAsync (mempool only).
// The rollup stopped producing blocks 2026-05-01, but the Meta Earth backend
// records check-ins from mempool acceptance. This is confirmed from live mempool
// inspection — ALL real bots in the rollup mempool use this same approach.
const ROLLUP_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:23011',
  testnet: 'http://118.175.0.249:46657',
};
const ROLLUP_CHAIN_ID: Record<string, string> = {
  mainnet: 'mecheckin_101-1',
  testnet: 'mecheckin_100-1',
};
const ADDRESS_PREFIX = 'me';

// ── Check-in type ──────────────────────────────────────────────────────────────
// Confirmed from live rollup mempool inspection (2026-06-10):
//   ALL real bots use /stchain.rollapp.checkin.MsgCheckIn with 2 fields.
// DO NOT use /mechain.checkin.MsgCheckIn (3-field) or
// /metaearth.wstaking.MsgNewRecord (Show E module — different task entirely).
const CHECKIN_TYPE_URL = '/stchain.rollapp.checkin.MsgCheckIn';

function buildMsgCheckInType(): Type {
  const root = new Root();
  const T = new Type('MsgCheckIn')
    .add(new Field('checkInAddress', 1, 'string'))
    .add(new Field('checkInMessage', 2, 'string'));
  root.add(T);
  return T;
}
const MsgCheckInType = buildMsgCheckInType();

// Rollup fee: IBC MEC denom with amount "0" — matches what real check-in bots use in the mempool.
// Even though the rollup's fee_checker.go requires no minimum fee, specifying the IBC denom
// with amount "0" gives the tx the same priority as other bots, preventing mempool eviction
// when the mempool is full (5000 tx cap). Gas 500000 matches real bots (live mempool confirmed).
const ROLLUP_IBC_DENOM = 'ibc/BC7F4D581D88785A22824C8FB6807DFC3B65C1764AFF1230D954AAB06B70CBC5';
const ROLLUP_FEE = {
  amount: [{ denom: ROLLUP_IBC_DENOM, amount: '0' }],
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

export async function performCheckin(
  wallet: WalletInfo,
  network = 'mainnet',
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const rpc     = ROLLUP_RPC[network]     ?? ROLLUP_RPC.mainnet;
  const chainId = ROLLUP_CHAIN_ID[network] ?? ROLLUP_CHAIN_ID.mainnet;
  const message = process.env.CHECK_IN_MESSAGE ?? 'META EARTH! ME, My Way!';

  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  chain   : ${chainId}`);
  log(`  typeUrl : ${CHECKIN_TYPE_URL}`);
  log(`  message : ${message}`);
  log(`  rpc     : ${rpc}`);
  log(`  fee     : ibc/BC7F4D... amount=0, gas=500000, broadcastTxSync`);

  try {
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
    } catch {
      return {
        success: false,
        error: 'Account not found on rollup — wallet must have received tokens first',
      };
    }

    const msg = {
      typeUrl: CHECKIN_TYPE_URL,
      value: MsgCheckInType.fromObject({
        checkInAddress: wallet.address,
        checkInMessage: message,
      }),
    };

    async function tryBroadcast(seq: number): Promise<{ code: number; logMsg: string; hash: string }> {
      const signed = await client.sign(wallet.address, [msg], ROLLUP_FEE, '', {
        accountNumber,
        sequence: seq,
        chainId,
      });
      const txBytes = encodeTxRaw(signed);
      // Use broadcastTxSync so we get real CheckTx results (errors, sequence mismatches).
      // The rollup fee_checker.go has no min gas price, so fee=0 txs pass CheckTx fine.
      const res = await (tmClient as any).broadcastTxSync({ tx: txBytes });
      return {
        code: res.code ?? 0,
        logMsg: res.log ?? '',
        hash: Buffer.from(res.hash).toString('hex').toUpperCase(),
      };
    }

    // Attempt 1 with on-chain sequence
    let result = await tryBroadcast(sequence);

    // Code 32 = sequence mismatch: mempool already has a pending tx at this sequence
    // (from a previous check-in that was never delivered because the rollup stopped
    // producing blocks). Parse the expected sequence from the error and retry once.
    if (result.code === 32) {
      const expected = parseExpectedSequence(result.logMsg);
      if (expected !== null && expected !== sequence) {
        log(`${wallet.label} sequence mismatch — on-chain: ${sequence}, mempool expects: ${expected}. Retrying...`);
        result = await tryBroadcast(expected);
      }
    }

    if (result.code !== 0) {
      return { success: false, error: `CheckTx code ${result.code}: ${result.logMsg}` };
    }

    log(`${wallet.label} check-in accepted by rollup mempool. TX: ${result.hash}`);
    return { success: true, txHash: result.hash };
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
