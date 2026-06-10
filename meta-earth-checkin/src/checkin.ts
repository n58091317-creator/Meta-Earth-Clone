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
// Source: repos/meta-earth-js-sdk/src/config/define.ts (MAIN_NET_CONFIG / TEST_NET_CONFIG)
const HUB_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:16657',
  testnet: 'http://118.175.0.249:26657',
};

// Source: repos/meta-earth-js-sdk/src/config/define.ts (PREFIX)
const ADDRESS_PREFIX = 'me';

// ── mechain.checkin.MsgCheckIn ────────────────────────────────────────────────
//
// Source (proto):     repos/meta-earth/proto/mechain/checkin/tx.proto
// Source (generated): repos/meta-earth/x/checkin/types/tx.pb.go
// Source (TS types):  repos/meta-earth/ts-client/mechain.checkin/types/mechain/checkin/tx.ts
// Source (registry):  repos/meta-earth/ts-client/mechain.checkin/registry.ts
// Source (module):    repos/meta-earth/ts-client/mechain.checkin/module.ts
//
// Proto definition (mechain/checkin/tx.proto):
//   package mechain.checkin;
//   message MsgCheckIn {
//     string check_in_address  = 1;
//     string check_in_message  = 2;
//     string check_in_timezone = 3;
//   }
//
// Wire encoding (from tx.pb.go MarshalToSizedBuffer & ts-client tx.ts encode):
//   field 1 (checkInAddress)  → writer.uint32(10).string(...)   tag 0x0a
//   field 2 (checkInMessage)  → writer.uint32(18).string(...)   tag 0x12
//   field 3 (checkInTimezone) → writer.uint32(26).string(...)   tag 0x1a
//
// Type URL (from repos/meta-earth/ts-client/mechain.checkin/registry.ts):
//   /mechain.checkin.MsgCheckIn
//
// checkInMessage validation (repos/meta-earth/x/checkin/types/message_check_in.go, ValidateBasic):
//   msg.CheckInMessage must equal "ME, My Way!" exactly
//
// Fee (repos/meta-earth/ts-client/mechain.checkin/module.ts, defaultFee):
//   { amount: [], gas: "200000" }  ← zero fee
//
// Broadcast (repos/meta-earth/ts-client/mechain.checkin/module.ts, sendMsgCheckIn):
//   signingClient.signAndBroadcast(address, [msg], fee, memo)

const CHECKIN_TYPE_URL = '/mechain.checkin.MsgCheckIn';

// Required by ValidateBasic in repos/meta-earth/x/checkin/types/message_check_in.go line 47:
//   if msg.CheckInMessage != "ME, My Way!" { return error }
const CHECK_IN_MESSAGE = 'ME, My Way!';

// Zero fee — from repos/meta-earth/ts-client/mechain.checkin/module.ts (defaultFee)
const CHECKIN_FEE = {
  amount: [] as { denom: string; amount: string }[],
  gas: '200000',
};

// ── Protobuf type — exact match of mechain/checkin/tx.proto ──────────────────
//
// Field numbers and camelCase names verified against:
//   repos/meta-earth/x/checkin/types/tx.pb.go  (struct tags: json:"check_in_address")
//   repos/meta-earth/ts-client/mechain.checkin/types/mechain/checkin/tx.ts (MsgCheckIn interface)

function buildMsgCheckInType(): Type {
  const root = new Root();
  const T = new Type('MsgCheckIn')
    .add(new Field('checkInAddress',  1, 'string'))
    .add(new Field('checkInMessage',  2, 'string'))
    .add(new Field('checkInTimezone', 3, 'string'));
  root.add(T);
  return T;
}
const MsgCheckInType = buildMsgCheckInType();

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

// ── Client builder ────────────────────────────────────────────────────────────
//
// Matches repos/meta-earth/ts-client/mechain.checkin/module.ts (txClient / sendMsgCheckIn):
//   SigningStargateClient.connectWithSigner(addr, signer, { registry, prefix })

async function buildCheckinClient(
  wallet: WalletInfo,
  network: string,
): Promise<SigningStargateClient> {
  const signer = await buildSigner(wallet);
  const rpc = HUB_RPC[network] ?? HUB_RPC.mainnet;
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(CHECKIN_TYPE_URL, MsgCheckInType as any);
  return SigningStargateClient.connectWithSigner(rpc, signer, { registry });
}

// ── Check-in ──────────────────────────────────────────────────────────────────

export async function performCheckin(
  wallet: WalletInfo,
  network = 'mainnet',
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const rpc = HUB_RPC[network] ?? HUB_RPC.mainnet;

  // checkInTimezone: configurable via env.
  // CLI example from repos/meta-earth/x/checkin/client/cli/tx_check_in.go:
  //   Use: "check-in 'ME, My Way!' 'Asia/Shanghai'"
  const timezone = process.env.CHECK_IN_TIMEZONE ?? 'UTC';

  log(`Starting daily check-in for ${wallet.label} (${wallet.address})`);
  log(`  module   : mechain.checkin.MsgCheckIn`);
  log(`  rpc      : ${rpc}`);
  log(`  message  : ${CHECK_IN_MESSAGE}`);
  log(`  timezone : ${timezone}`);
  log(`  fee      : zero (amount: [], gas: 200000)`);

  try {
    const client = await buildCheckinClient(wallet, network);

    // MsgCheckIn fields — from repos/meta-earth/x/checkin/types/message_check_in.go (NewMsgCheckIn):
    //   NewMsgCheckIn(checkInAddress, checkInMessage, checkInTimezone)
    const msg = {
      typeUrl: CHECKIN_TYPE_URL,
      value: MsgCheckInType.fromObject({
        checkInAddress:  wallet.address,
        checkInMessage:  CHECK_IN_MESSAGE,
        checkInTimezone: timezone,
      }),
    };

    // signAndBroadcast — from repos/meta-earth/ts-client/mechain.checkin/module.ts (sendMsgCheckIn):
    //   signingClient.signAndBroadcast(address, [msg], fee, memo)
    const result = await client.signAndBroadcast(wallet.address, [msg], CHECKIN_FEE, '');

    if (result.code !== 0) {
      return {
        success: false,
        error: `code ${result.code}: ${(result.rawLog ?? 'unknown error').slice(0, 300)}`,
      };
    }

    log(`${wallet.label} check-in SUCCESS. TX: ${result.transactionHash}`);
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
