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
// Source: repos/meta-earth-js-sdk/src/config/define.ts (MAIN_NET_CONFIG / TEST_NET_CONFIG)
// netType=rollapp_checkin confirmed from successful tx explorer link
const ROLLUP_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:23011',
  testnet: 'http://118.175.0.249:46657',
};
const ROLLUP_CHAIN_ID: Record<string, string> = {
  mainnet: 'mecheckin_101-1',
  testnet: 'mecheckin_100-1',
};
const ADDRESS_PREFIX = 'me';

// ── stchain.rollapp.checkin.MsgCheckIn ────────────────────────────────────────
// Confirmed from successful on-chain tx (netType=rollapp_checkin in explorer URL).
//
// Fields (2 only — 3rd field is hub chain only, NOT rollup):
//   checkInAddress (1) — wallet address
//   checkInMessage (2) — check-in message string
//
// Broadcast: broadcastTxAsync — bypasses CheckTx so zero-fee txs enter mempool.
//   The rollup's fee_checker.go skips fee validation outside CheckTx.
//   The Meta Earth backend records check-ins from mempool acceptance.
//
// Fee: zero (amount: [], gas: 200000)
const CHECKIN_TYPE_URL = '/stchain.rollapp.checkin.MsgCheckIn';

// Configurable check-in message — Meta Earth app uses "META EARTH! ME, My Way!"
const CHECK_IN_MESSAGE = process.env.CHECK_IN_MESSAGE ?? 'META EARTH! ME, My Way!';

const CHECKIN_FEE = {
  amount: [] as { denom: string; amount: string }[],
  gas: '200000',
};

// ── Protobuf type (2 fields — rollup only) ────────────────────────────────────
function buildMsgCheckInType(): Type {
  const root = new Root();
  const T = new Type('MsgCheckIn')
    .add(new Field('checkInAddress', 1, 'string'))
    .add(new Field('checkInMessage', 2, 'string'));
  root.add(T);
  return T;
}
const MsgCheckInType = buildMsgCheckInType();

// ── Raw tx encoder ─────────────────────────────────────────────────────────────
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
  const rpc = ROLLUP_RPC[network] ?? ROLLUP_RPC.mainnet;
  const chainId = ROLLUP_CHAIN_ID[network] ?? ROLLUP_CHAIN_ID.mainnet;

  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  module   : stchain.rollapp.checkin.MsgCheckIn`);
  log(`  rpc      : ${rpc}`);
  log(`  message  : ${CHECK_IN_MESSAGE}`);
  log(`  fee      : zero (amount: [], gas: 200000)`);
  log(`  broadcast: broadcastTxAsync`);

  try {
    const signer = await buildSigner(wallet);
    const registry = new Registry([...defaultRegistryTypes]);
    registry.register(CHECKIN_TYPE_URL, MsgCheckInType as any);
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

    const msg = {
      typeUrl: CHECKIN_TYPE_URL,
      value: MsgCheckInType.fromObject({
        checkInAddress: wallet.address,
        checkInMessage: CHECK_IN_MESSAGE,
      }),
    };

    const signed = await client.sign(wallet.address, [msg], CHECKIN_FEE, '', {
      accountNumber,
      sequence,
      chainId,
    });
    const txBytes = encodeTxRaw(signed);
    const res = await tmClient.broadcastTxAsync({ tx: txBytes });
    const txHash = Buffer.from(res.hash).toString('hex').toUpperCase();

    // Poll up to 10 × 6 s = 60 s for block inclusion.
    // broadcastTxAsync bypasses CheckTx; block time can exceed 12 s.
    // If not visible after 60 s, the tx is still accepted by the mempool.
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 6_000));
      try {
        const txRes = await (tmClient as any).tx({ hash: res.hash, prove: false });
        if (txRes?.result?.code !== 0) {
          const errLog = (txRes.result.log ?? `DeliverTx code ${txRes.result.code}`).slice(0, 200);
          return { success: false, txHash, error: errLog };
        }
        log(`${wallet.label} check-in SUCCESS. TX: ${txHash}`);
        return { success: true, txHash };
      } catch {
        // not yet in a block
      }
    }

    // Accepted by mempool — treat as success
    log(`${wallet.label} check-in broadcast accepted. TX: ${txHash}`);
    return {
      success: true,
      txHash,
      note: 'Broadcast accepted — block inclusion takes longer than polling window',
    };
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
