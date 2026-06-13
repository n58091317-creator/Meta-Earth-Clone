import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
  OfflineSigner,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import _m0 from 'protobufjs/minimal';
import { StoredWallet } from './store';

const HUB_RPC  = 'http://118.175.0.247:16657';
const HUB_REST = 'http://118.175.0.247:11317';

// ── Rollup chain config ─────────────────────────────────────────────────────
// Official check-in rollup: mecheckin_400-1 (confirmed by Meta Earth team 2026-06-13).
//   SDK config points to 118.175.0.249:46657. Chain ID is fetched dynamically at
//   broadcast time via /status so we always sign with the chain's actual ID.
// NEW wallets need testnet tokens before they can check in: https://www.mec.me/en-US/faucet
// OLD rollup (mecheckin_101-1): dead, no blocks since 2026-05-01. Used as fallback.
const NEW_ROLLUP_RPC   = 'http://118.175.0.249:46657';
const NEW_ROLLUP_REST  = 'http://118.175.0.249:3317';
const OLD_ROLLUP_RPC   = 'http://118.175.0.247:23011';
const OLD_ROLLUP_REST  = 'http://118.175.0.247:11317';
const OLD_ROLLUP_CHAIN = 'mecheckin_101-1';

const ROLLUP_RPC: Record<string, string>  = { mainnet: NEW_ROLLUP_RPC,  testnet: NEW_ROLLUP_RPC  };
const ROLLUP_REST: Record<string, string> = { mainnet: NEW_ROLLUP_REST, testnet: NEW_ROLLUP_REST };

/** Fetch the chain's actual chain ID from its /status endpoint. */
async function fetchRollupChainId(rpc: string): Promise<string> {
  const res = await fetchWithTimeout(`${rpc.replace(/\/$/, '')}/status`);
  const data = await res.json() as any;
  return data?.result?.node_info?.network as string;
}

// IBC: hub channel-1 → rollup channel-0
const IBC_HUB_CHANNEL    = 'channel-1';
const IBC_SOURCE_PORT    = 'transfer';
// IBC denom of hub MEC on the rollup chain
export const ROLLUP_IBC_DENOM =
  'ibc/BC7F4D581D88785A22824C8FB6807DFC3B65C1764AFF1230D954AAB06B70CBC5';

const HUB_FEE = { amount: [{ denom: 'umec', amount: '10000' }], gas: '500000' };
// Per-chain fee structures:
//   NEW rollup: no minimum gas price → empty fee array
//   OLD rollup: min-gas-price 0.001umec → 500umec for 500000 gas
const NEW_ROLLUP_FEE = { amount: [] as { denom: string; amount: string }[], gas: '500000' };
const OLD_ROLLUP_FEE = { amount: [{ denom: 'umec', amount: '500' }], gas: '500000' };
const ADDRESS_PREFIX = 'me';
// Hub wstaking module URLs — used for Show E, staking rewards, and unstaking.
// NOT used for daily check-in.
const WSTAKING_NEW_RECORD_URL = '/metaearth.wstaking.MsgNewRecord';
const WSTAKING_CLAIM_URL = '/metaearth.wstaking.MsgWithdrawDelegatorReward';
const WSTAKING_UNSTAKE_URL = '/metaearth.wstaking.MsgUnstake';
const FETCH_TIMEOUT_MS   = 12_000;
const CLIENT_TIMEOUT_MS  = 15_000;  // max wait for Tendermint WS connect + sign + broadcast

/** Race a promise against a hard timeout to prevent indefinite hangs on slow RPC nodes. */
function withTimeout<T>(ms: number, label: string, fn: () => Promise<T>): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

// ─── Protobuf type definitions ────────────────────────────────────────────────
//
// All types use protobufjs/minimal Writer — proper GeneratedType-compatible objects
// matching the pattern in repos/meta-earth/ts-client/mechain.checkin/types/mechain/checkin/tx.ts
// This is required so cosmjs registry.encodeAsAny() produces correctly encoded bytes.

// ── MsgCheckIn schema (from repos/meta-earth/proto/mechain/checkin/tx.proto) ──
// NEW rollup uses /mechain.checkin.MsgCheckIn with 3 string fields:
//   checkInAddress (1), checkInMessage (2), checkInTimezone (3)
// OLD rollup (dead, mecheckin_101-1) uses /stchain.rollapp.checkin.MsgCheckIn:
//   creator (1), slogan (2), recoverInterruption (3, bool)
const NEW_CHECKIN_TYPE_URL = '/mechain.checkin.MsgCheckIn';
const OLD_CHECKIN_TYPE_URL = '/stchain.rollapp.checkin.MsgCheckIn';

interface INewMsgCheckIn { checkInAddress: string; checkInMessage: string; checkInTimezone: string; }
interface IOldMsgCheckIn { creator: string; slogan: string; recoverInterruption: boolean; }

const NewMsgCheckInType = {
  encode(msg: INewMsgCheckIn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (msg.checkInAddress !== '') writer.uint32(10).string(msg.checkInAddress);
    if (msg.checkInMessage  !== '') writer.uint32(18).string(msg.checkInMessage);
    if (msg.checkInTimezone !== '') writer.uint32(26).string(msg.checkInTimezone);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): INewMsgCheckIn {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const result: INewMsgCheckIn = { checkInAddress: '', checkInMessage: '', checkInTimezone: '' };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: result.checkInAddress = reader.string(); break;
        case 2: result.checkInMessage = reader.string(); break;
        case 3: result.checkInTimezone = reader.string(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return result;
  },
  fromPartial(obj: Partial<INewMsgCheckIn>): INewMsgCheckIn {
    return { checkInAddress: obj.checkInAddress ?? '', checkInMessage: obj.checkInMessage ?? '', checkInTimezone: obj.checkInTimezone ?? '' };
  },
};

const OldMsgCheckInType = {
  encode(msg: IOldMsgCheckIn, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (msg.creator !== '') writer.uint32(10).string(msg.creator);
    if (msg.slogan  !== '') writer.uint32(18).string(msg.slogan);
    if (msg.recoverInterruption) writer.uint32(24).bool(msg.recoverInterruption);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): IOldMsgCheckIn {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const result: IOldMsgCheckIn = { creator: '', slogan: '', recoverInterruption: false };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: result.creator = reader.string(); break;
        case 2: result.slogan  = reader.string(); break;
        case 3: result.recoverInterruption = reader.bool(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return result;
  },
  fromPartial(obj: Partial<IOldMsgCheckIn>): IOldMsgCheckIn {
    return { creator: obj.creator ?? '', slogan: obj.slogan ?? '', recoverInterruption: obj.recoverInterruption ?? false };
  },
};

// MsgNewRecord — hub chain wstaking module (Show E task, NOT daily check-in).
// Fields confirmed from proto/metaearth/wstaking/record.proto and live tx inspection.
interface IMsgNewRecord { actionNumber: string; actionUrl: string; from: string; }
const MsgNewRecordType = {
  encode(msg: IMsgNewRecord, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (msg.actionNumber !== '') writer.uint32(10).string(msg.actionNumber);
    if (msg.actionUrl    !== '') writer.uint32(18).string(msg.actionUrl);
    if (msg.from         !== '') writer.uint32(26).string(msg.from);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): IMsgNewRecord {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const result: IMsgNewRecord = { actionNumber: '', actionUrl: '', from: '' };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: result.actionNumber = reader.string(); break;
        case 2: result.actionUrl    = reader.string(); break;
        case 3: result.from         = reader.string(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return result;
  },
  fromPartial(obj: Partial<IMsgNewRecord>): IMsgNewRecord {
    return { actionNumber: obj.actionNumber ?? '', actionUrl: obj.actionUrl ?? '', from: obj.from ?? '' };
  },
};

interface IMsgWstakingWithdraw { delegatorAddress: string; validatorAddress: string; }
const MsgWstakingWithdrawType = {
  encode(msg: IMsgWstakingWithdraw, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (msg.delegatorAddress !== '') writer.uint32(10).string(msg.delegatorAddress);
    if (msg.validatorAddress !== '') writer.uint32(18).string(msg.validatorAddress);
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): IMsgWstakingWithdraw {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const result: IMsgWstakingWithdraw = { delegatorAddress: '', validatorAddress: '' };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: result.delegatorAddress = reader.string(); break;
        case 2: result.validatorAddress = reader.string(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return result;
  },
  fromPartial(obj: Partial<IMsgWstakingWithdraw>): IMsgWstakingWithdraw {
    return { delegatorAddress: obj.delegatorAddress ?? '', validatorAddress: obj.validatorAddress ?? '' };
  },
};

interface ICoin { denom: string; amount: string; }
interface IMsgWstakingUnstake { stakerAddress: string; validatorAddress: string; amount?: ICoin; }
const MsgWstakingUnstakeType = {
  encode(msg: IMsgWstakingUnstake, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (msg.stakerAddress    !== '') writer.uint32(10).string(msg.stakerAddress);
    if (msg.validatorAddress !== '') writer.uint32(18).string(msg.validatorAddress);
    if (msg.amount != null) {
      const coinWriter = _m0.Writer.create();
      if (msg.amount.denom  !== '') coinWriter.uint32(10).string(msg.amount.denom);
      if (msg.amount.amount !== '') coinWriter.uint32(18).string(msg.amount.amount);
      writer.uint32(26).bytes(coinWriter.finish());
    }
    return writer;
  },
  decode(input: _m0.Reader | Uint8Array, length?: number): IMsgWstakingUnstake {
    const reader = input instanceof _m0.Reader ? input : new _m0.Reader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const result: IMsgWstakingUnstake = { stakerAddress: '', validatorAddress: '' };
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1: result.stakerAddress    = reader.string(); break;
        case 2: result.validatorAddress = reader.string(); break;
        default: reader.skipType(tag & 7); break;
      }
    }
    return result;
  },
  fromPartial(obj: Partial<IMsgWstakingUnstake>): IMsgWstakingUnstake {
    return { stakerAddress: obj.stakerAddress ?? '', validatorAddress: obj.validatorAddress ?? '', amount: obj.amount };
  },
};

function encodeTxRaw(txRaw: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: Uint8Array[];
}): Uint8Array {
  const w = _m0.Writer.create();
  if (txRaw.bodyBytes?.length) w.uint32(10).bytes(txRaw.bodyBytes);
  if (txRaw.authInfoBytes?.length) w.uint32(18).bytes(txRaw.authInfoBytes);
  for (const sig of txRaw.signatures ?? []) w.uint32(26).bytes(sig);
  return w.finish();
}

// ─── Signer / Client builders ─────────────────────────────────────────────────

async function buildSigner(wallet: StoredWallet): Promise<OfflineSigner> {
  if (wallet.privateKey) {
    const keyBytes = Buffer.from(wallet.privateKey, 'hex');
    return DirectSecp256k1Wallet.fromKey(new Uint8Array(keyBytes), ADDRESS_PREFIX);
  }
  if (wallet.mnemonic) {
    return DirectSecp256k1HdWallet.fromMnemonic(wallet.mnemonic, { prefix: ADDRESS_PREFIX });
  }
  throw new Error('No credentials for wallet ' + wallet.id);
}

async function buildHubClient(wallet: StoredWallet): Promise<SigningStargateClient> {
  const signer = await buildSigner(wallet);
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(WSTAKING_NEW_RECORD_URL, MsgNewRecordType as any);
  registry.register(WSTAKING_CLAIM_URL,      MsgWstakingWithdrawType as any);
  registry.register(WSTAKING_UNSTAKE_URL,    MsgWstakingUnstakeType as any);
  return withTimeout(CLIENT_TIMEOUT_MS, 'buildHubClient',
    () => SigningStargateClient.connectWithSigner(HUB_RPC, signer, { registry })
  );
}

async function buildRollupClient(wallet: StoredWallet, rpc: string) {
  const signer = await buildSigner(wallet);
  const registry = new Registry([...defaultRegistryTypes]);
  // Register both rollup check-in schemas — new and old rollup use different type URLs
  registry.register(NEW_CHECKIN_TYPE_URL, NewMsgCheckInType as any);
  registry.register(OLD_CHECKIN_TYPE_URL, OldMsgCheckInType as any);
  const { tmClient, client } = await withTimeout(CLIENT_TIMEOUT_MS, 'buildRollupClient', async () => {
    const tmClient = await Tendermint37Client.connect(rpc);
    const client   = await SigningStargateClient.createWithSigner(tmClient, signer, { registry });
    return { tmClient, client };
  });
  return { tmClient, client };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Rollup broadcast with sequence retry ────────────────────────────────────

export interface TxResult {
  success: boolean;
  txHash?: string;
  error?: string;
  note?: string;
  permanent?: boolean;
}

/** Poll for tx delivery. Returns the tx result or null if not found within timeout. */
async function pollTxResult(
  tmClient: Tendermint37Client,
  hash: Uint8Array,
  attempts: number,
  delayMs: number,
): Promise<{ result: { code: number; log?: string } } | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise(r => setTimeout(r, delayMs));
    try {
      const txRes = await (tmClient as any).tx({ hash, prove: false });
      return txRes;
    } catch {
      // Not yet included in a block — keep polling
    }
  }
  return null;
}

/** Parse "expected N, got M" from a code-32 sequence mismatch log string. Returns N or null. */
function parseExpectedSequence(log: string): number | null {
  const m = log.match(/expected\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Sign and broadcast a tx to the rollup. Returns the CheckTx result. */
async function signAndBroadcast(
  tmClient: Tendermint37Client,
  client: SigningStargateClient,
  wallet: StoredWallet,
  msgs: any[],
  memo: string,
  chainId: string,
  accountNumber: number,
  sequence: number,
  fee: typeof NEW_ROLLUP_FEE,
): Promise<{ code: number; log: string; hash: string }> {
  const signed = await client.sign(wallet.address, msgs, fee, memo, {
    accountNumber,
    sequence,
    chainId,
  });
  const txBytes = encodeTxRaw(signed);
  // broadcastTxSync: runs CheckTx synchronously so we see the real error code.
  // The fee_checker.go has no minGasPrices set, so fee=0 txs pass CheckTx fine.
  const res = await (tmClient as any).broadcastTxSync({ tx: txBytes });
  return {
    code: res.code ?? 0,
    log: res.log ?? '',
    hash: Buffer.from(res.hash).toString('hex').toUpperCase(),
  };
}

/** Broadcast to one specific rollup chain. Returns null if wallet account doesn't exist. */
async function rollupBroadcastToChain(
  wallet: StoredWallet,
  msgs: any[],
  memo: string,
  rpc: string,
  chainId: string,
  fee: typeof NEW_ROLLUP_FEE = NEW_ROLLUP_FEE,
): Promise<TxResult | null> {
  const { tmClient, client } = await buildRollupClient(wallet, rpc);

  let accountNumber = 0;
  let sequence = 0;
  let accountMissing = false;
  try {
    const acct = await client.getSequence(wallet.address);
    accountNumber = acct.accountNumber;
    sequence = acct.sequence;
  } catch (e: any) {
    const msg = e?.message ?? '';
    if (msg.includes('does not exist') || msg.includes('not found')) {
      // Account doesn't exist yet — try broadcasting with seq=0 anyway.
      // Some rollup chains auto-create accounts on first tx (especially with empty fee).
      accountMissing = true;
      accountNumber = 0;
      sequence = 0;
    } else {
      throw e;
    }
  }

  let result = await signAndBroadcast(tmClient, client as any, wallet, msgs, memo, chainId, accountNumber, sequence, fee);

  // Code 9 = fee payer / signer doesn't exist — wallet truly not activated on this chain
  if (result.code === 9) {
    return null;
  }

  // If we tried with a missing account and got a non-zero code, report it rather than fall through
  if (accountMissing && result.code !== 0) {
    console.log(`[blockchain] ${wallet.label}: new account attempt on ${chainId} returned code ${result.code}: ${result.log}`);
    return null;
  }

  // Code 32 = sequence mismatch — retry with expected sequence
  if (result.code === 32) {
    const expectedSeq = parseExpectedSequence(result.log);
    if (expectedSeq !== null && expectedSeq !== sequence) {
      console.log(`[blockchain] Sequence mismatch for ${wallet.label}: expected ${expectedSeq}, retrying...`);
      result = await signAndBroadcast(tmClient, client as any, wallet, msgs, memo, chainId, accountNumber, expectedSeq, fee);
    }
  }

  if (result.code !== 0) {
    return { success: false, error: `CheckTx code ${result.code}: ${result.log}` };
  }
  return { success: true, txHash: result.hash };
}

async function rollupBroadcast(
  wallet: StoredWallet,
  msgs: any[],
  memo = '',
  _network = 'mainnet'
): Promise<TxResult> {
  try {
    // Fetch the real chain ID from the NEW rollup's /status, then try it first
    let newChainId: string | null = null;
    try {
      newChainId = await fetchRollupChainId(NEW_ROLLUP_RPC);
    } catch {
      console.log(`[blockchain] NEW rollup unreachable, falling back to old rollup.`);
    }

    if (newChainId) {
      const newResult = await rollupBroadcastToChain(wallet, msgs, memo, NEW_ROLLUP_RPC, newChainId, NEW_ROLLUP_FEE);
      if (newResult !== null) return newResult;
      console.log(`[blockchain] ${wallet.label}: wallet not on new rollup (${newChainId}), falling back to old rollup.`);
      console.log(`[blockchain]   ⚠️  Activate wallet: get testnet tokens at https://www.mec.me/en-US/faucet`);
    }

    const oldResult = await rollupBroadcastToChain(wallet, msgs, memo, OLD_ROLLUP_RPC, OLD_ROLLUP_CHAIN, OLD_ROLLUP_FEE);
    if (oldResult === null) {
      return { success: false, error: 'Wallet not found on either rollup chain. Get testnet tokens at https://www.mec.me/en-US/faucet' };
    }
    return oldResult;
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// ─── Balance Queries ──────────────────────────────────────────────────────────

export async function getHubBalance(address: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `${HUB_REST}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=20`
    );
    const json = (await res.json()) as any;
    const coin = (json.balances ?? []).find((b: any) => b.denom === 'umec');
    return coin ? parseInt(coin.amount, 10) : 0;
  } catch {
    return 0;
  }
}

export interface Coin { denom: string; amount: number }

export async function getRollupBalances(address: string, network = 'mainnet'): Promise<Coin[]> {
  const rest = ROLLUP_REST[network] ?? ROLLUP_REST.mainnet;
  // Let errors propagate — callers must distinguish "query failed" from "genuinely empty"
  const res = await fetchWithTimeout(
    `${rest}/cosmos/bank/v1beta1/balances/${address}?pagination.limit=50`
  );
  if (!res.ok) throw new Error(`Rollup REST error ${res.status} for ${address}`);
  const json = (await res.json()) as any;
  if (json.code !== undefined) throw new Error(`Rollup REST gRPC error ${json.code}: ${json.message}`);
  return (json.balances ?? []).map((b: any) => ({
    denom: b.denom,
    amount: parseInt(b.amount, 10),
  }));
}

// ─── Staking Queries — wstaking custom module ─────────────────────────────────
// The hub uses metaearth.wstaking, NOT the standard cosmos staking/distribution modules.
// Endpoints: /metaearth/wstaking/delegation/{addr} and /metaearth/wstaking/delegation-rewards/{addr}

interface WstakingDelegation {
  validatorAddress: string;
  balanceUmec: number;
}

async function getWstakingDelegation(address: string): Promise<WstakingDelegation | null> {
  try {
    const res = await fetchWithTimeout(`${HUB_REST}/metaearth/wstaking/delegation/${address}`);
    const json = (await res.json()) as any;
    if (json.code !== undefined) return null; // gRPC error
    const delResp = json.delegation_response;
    if (!delResp) return null;
    return {
      validatorAddress: delResp.delegation?.validator_address ?? '',
      balanceUmec: parseInt(delResp.balance?.amount ?? '0', 10),
    };
  } catch {
    return null;
  }
}

async function getWstakingRewardsUmec(address: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(`${HUB_REST}/metaearth/wstaking/delegation-rewards/${address}`);
    const json = (await res.json()) as any;
    if (json.code !== undefined) return 0;
    const rewards: any[] = json.rewards ?? [];
    const umec = rewards.find((r: any) => r.denom === 'umec');
    return umec ? Math.floor(parseFloat(umec.amount)) : 0;
  } catch {
    return 0;
  }
}

export async function getStakingRewards(address: string): Promise<number> {
  return getWstakingRewardsUmec(address);
}

export async function getStakingDelegations(address: string): Promise<string[]> {
  const d = await getWstakingDelegation(address);
  return d?.validatorAddress ? [d.validatorAddress] : [];
}

export interface StakingDelegation {
  validatorAddress: string;
  stakedUmec: number;
  pendingRewardsUmec: number;
}

export interface UnbondingEntry {
  validatorAddress: string;
  completionTime: string;
  amountUmec: number;
}

export async function getStakingDelegationsDetailed(address: string): Promise<StakingDelegation[]> {
  try {
    const [delegation, rewardsUmec] = await Promise.all([
      getWstakingDelegation(address),
      getWstakingRewardsUmec(address),
    ]);
    if (!delegation?.validatorAddress) return [];
    return [{
      validatorAddress: delegation.validatorAddress,
      stakedUmec: delegation.balanceUmec,
      pendingRewardsUmec: rewardsUmec,
    }];
  } catch {
    return [];
  }
}

export async function getUnbondingDelegations(address: string): Promise<UnbondingEntry[]> {
  // wstaking module unbonding endpoint (best-effort — chain may not expose this REST)
  try {
    const res = await fetchWithTimeout(
      `${HUB_REST}/cosmos/staking/v1beta1/delegators/${address}/unbonding_delegations`
    );
    const json = (await res.json()) as any;
    if (json.code !== undefined) return [];
    const entries: UnbondingEntry[] = [];
    for (const ub of (json.unbonding_responses ?? [])) {
      for (const entry of (ub.entries ?? [])) {
        entries.push({
          validatorAddress: ub.validator_address,
          completionTime: entry.completion_time,
          amountUmec: parseInt(entry.balance ?? '0', 10),
        });
      }
    }
    return entries;
  } catch {
    return [];
  }
}

// ─── Hub staking operations (wstaking module) ─────────────────────────────────

export async function undelegateFromValidator(
  wallet: StoredWallet,
  validatorAddress: string,
  amountUmec: number
): Promise<TxResult> {
  try {
    const client = await buildHubClient(wallet);
    const msg = {
      typeUrl: WSTAKING_UNSTAKE_URL,
      value: {
        stakerAddress: wallet.address,
        validatorAddress,
        amount: { denom: 'umec', amount: String(amountUmec) },
      },
    };
    const result = await client.signAndBroadcast(wallet.address, [msg], HUB_FEE, '');
    if (result.code !== 0) return { success: false, error: `code ${result.code}: ${result.rawLog}` };
    return { success: true, txHash: result.transactionHash };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export interface WalletBalances {
  hub: number;       // umec
  rollup: Coin[];    // each coin in smallest unit
  rollupTotal: number; // total rollup in umec-equivalent smallest units
  staking: number;   // umec rewards
}

export async function getAllBalances(address: string, network = 'mainnet'): Promise<WalletBalances> {
  const [hub, rollupResult, staking] = await Promise.all([
    getHubBalance(address),
    getRollupBalances(address, network).catch(() => [] as Coin[]),
    getStakingRewards(address),
  ]);
  const ibcMec = rollupResult.find(b => b.denom === ROLLUP_IBC_DENOM);
  const rollupTotal = ibcMec?.amount ?? 0;
  return { hub, rollup: rollupResult, rollupTotal, staking };
}

// ─── Operations ───────────────────────────────────────────────────────────────

// ─── Daily check-in ───────────────────────────────────────────────────────────
// Both rollups use /stchain.rollapp.checkin.MsgCheckIn (creator, slogan, recoverInterruption).
// /mechain.checkin.MsgCheckIn is NOT registered on either live chain (confirmed 2026-06-13).
// New rollup is ALIVE — use signAndBroadcast (waits for DeliverTx block confirmation).
// Old rollup is DEAD — keep broadcastTxSync (CheckTx only, no blocks since 2026-05-01).
// Pattern matches openroll ts-client module.ts: connectWithSigner + signAndBroadcast.

/** Check-in on the NEW rollup via signAndBroadcast → real DeliverTx confirmation. */
async function newRollupCheckin(
  wallet: StoredWallet,
  rpc: string,
  chainId: string,
  slogan: string,
): Promise<TxResult | null> {
  const signer   = await buildSigner(wallet);
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(OLD_CHECKIN_TYPE_URL, OldMsgCheckInType as any);

  // connectWithSigner: official pattern from openroll ts-client / meta-earth-js-sdk
  const client = await withTimeout(CLIENT_TIMEOUT_MS, 'newRollupCheckin:connect',
    () => SigningStargateClient.connectWithSigner(rpc, signer, { registry })
  );

  // Quick account check — avoids a full signAndBroadcast round-trip for unfunded wallets
  try {
    await client.getSequence(wallet.address);
  } catch (e: any) {
    const m = e?.message ?? '';
    if (m.includes('does not exist') || m.includes('not found')) {
      console.log(`[blockchain] ${wallet.label}: no account on ${chainId}. Fund at https://www.mec.me/en-US/faucet`);
      return null;
    }
    throw e;
  }

  const checkInMsg = {
    typeUrl: OLD_CHECKIN_TYPE_URL,
    value:   OldMsgCheckInType.fromPartial({ creator: wallet.address, slogan, recoverInterruption: false }),
  };

  // signAndBroadcast: auto-fetches sequence, signs, broadcasts, polls until DeliverTx.
  const result = await withTimeout(75_000, 'newRollupCheckin:signAndBroadcast',
    () => client.signAndBroadcast(wallet.address, [checkInMsg], NEW_ROLLUP_FEE)
  );

  if (result.code !== 0) {
    return { success: false, error: `DeliverTx code ${result.code}: ${result.rawLog ?? ''}` };
  }

  console.log(`[blockchain] ${wallet.label} ✓ check-in CONFIRMED on ${chainId}. TX: ${result.transactionHash}`);
  return { success: true, txHash: result.transactionHash };
}

export async function performCheckin(wallet: StoredWallet, network = 'mainnet'): Promise<TxResult> {
  const slogan = process.env.CHECK_IN_MESSAGE ?? 'ME, My Way!';

  try {
    // Step 1: Try NEW rollup — alive, produces blocks → signAndBroadcast for real confirmation
    let newChainId: string | null = null;
    try {
      newChainId = await fetchRollupChainId(NEW_ROLLUP_RPC);
    } catch {
      console.log(`[blockchain] ${wallet.label}: NEW rollup unreachable, falling back to old rollup.`);
    }

    if (newChainId) {
      const newResult = await newRollupCheckin(wallet, NEW_ROLLUP_RPC, newChainId, slogan);
      if (newResult !== null) return newResult;
    }

    // Step 2: OLD rollup fallback — dead (no blocks since 2026-05-01), CheckTx only
    const checkInMsg = {
      typeUrl: OLD_CHECKIN_TYPE_URL,
      value:   OldMsgCheckInType.fromPartial({ creator: wallet.address, slogan, recoverInterruption: false }),
    };
    const oldResult = await rollupBroadcastToChain(wallet, [checkInMsg], '', OLD_ROLLUP_RPC, OLD_ROLLUP_CHAIN, OLD_ROLLUP_FEE);
    if (oldResult === null) {
      return { success: false, error: 'Wallet not found on either rollup. Fund at https://www.mec.me/en-US/faucet' };
    }
    return oldResult;
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function hubSend(
  wallet: StoredWallet,
  to: string,
  amountUmec: number
): Promise<TxResult> {
  try {
    const client = await buildHubClient(wallet);
    const result = await client.sendTokens(
      wallet.address,
      to,
      [{ denom: 'umec', amount: String(amountUmec) }],
      HUB_FEE,
      'Transfer'
    );
    if (result.code !== 0) return { success: false, error: `code ${result.code}: ${result.rawLog}` };
    return { success: true, txHash: result.transactionHash };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

// Zero fee on rollup — no reserve needed. Minimum send = 1 000 units to avoid dust txs.
const ROLLUP_FEE_RESERVE = 0;
const ROLLUP_MIN_SEND    = 1_000;

export async function rollupSendAll(
  wallet: StoredWallet,
  to: string,
  network = 'mainnet'
): Promise<TxResult> {
  // Always query the real balance — errors propagate as failures (not silent skips)
  let balances: Coin[];
  try {
    balances = await getRollupBalances(wallet.address, network);
  } catch (err: any) {
    return { success: false, error: `Failed to query rollup balance: ${err?.message ?? err}` };
  }

  const ibcMec = balances.find(b => b.denom === ROLLUP_IBC_DENOM);
  const ibcAmount = ibcMec?.amount ?? 0;

  // Zero fee on rollup — send all tokens above dust threshold
  const msgs: any[] = [];
  for (const b of balances) {
    if (b.amount <= 0) continue;
    const sendAmount = b.amount - ROLLUP_FEE_RESERVE; // ROLLUP_FEE_RESERVE is 0
    if (sendAmount < ROLLUP_MIN_SEND) continue;
    msgs.push({
      typeUrl: '/cosmos.bank.v1beta1.MsgSend',
      value: {
        fromAddress: wallet.address,
        toAddress: to,
        amount: [{ denom: b.denom, amount: String(sendAmount) }],
      },
    });
  }

  // Build a human-readable summary of what was found on rollup
  function buildBalanceSummary(): string {
    if (balances.length === 0) return 'No tokens on rollup';
    return balances.map(b => {
      if (b.denom === ROLLUP_IBC_DENOM) {
        return `${(b.amount / 100_000_000).toFixed(8)} IBC-MEC (${b.amount} units)`;
      }
      return `${b.amount} ${b.denom}`;
    }).join(', ');
  }

  if (msgs.length === 0) {
    const ibcDisplay = (ibcAmount / 100_000_000).toFixed(8);
    let reason: string;
    if (balances.length === 0) {
      reason = 'Rollup wallet is empty';
    } else {
      reason = `all balances below ${ROLLUP_MIN_SEND} unit dust threshold`;
    }
    return {
      success: true,
      note: `Rollup queried: ${buildBalanceSummary()} | IBC-MEC: ${ibcDisplay} MEC — ${reason}, skipped`,
    };
  }

  const result = await rollupBroadcast(wallet, msgs, 'Rollup sweep', network);

  // Insufficient funds: chain may have a stale view of the balance
  if (!result.success && result.error?.includes('insufficient funds')) {
    const ibcDisplay = (ibcAmount / 100_000_000).toFixed(8);
    return {
      success: true,
      note: `Rollup sweep skipped — on-chain balance (${ibcDisplay} IBC-MEC REST-queried, ${buildBalanceSummary()}) insufficient; chain may have a stale view`,
    };
  }

  return result;
}

export async function rollupSendAmount(
  wallet: StoredWallet,
  to: string,
  denom: string,
  amount: number,
  network = 'mainnet'
): Promise<TxResult> {
  const msgs = [{
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: wallet.address,
      toAddress: to,
      amount: [{ denom, amount: String(amount) }],
    },
  }];
  return rollupBroadcast(wallet, msgs, 'Transfer', network);
}

export async function ibcTransferToRollup(
  masterWallet: StoredWallet,
  targetAddress: string,
  amountUmec: number
): Promise<TxResult> {
  try {
    const client = await buildHubClient(masterWallet);
    const timeoutTimestamp = BigInt(Date.now() + 10 * 60_000) * 1_000_000n;
    const result = await (client as any).sendIbcTokens(
      masterWallet.address,
      targetAddress,
      { denom: 'umec', amount: String(amountUmec) },
      IBC_SOURCE_PORT,
      IBC_HUB_CHANNEL,
      undefined,
      timeoutTimestamp,
      HUB_FEE,
      'Rollup registration'
    );
    if (result.code !== 0) {
      return { success: false, error: `IBC code ${result.code}: ${result.rawLog ?? ''}` };
    }
    return { success: true, txHash: result.transactionHash };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export async function withdrawStakingRewards(wallet: StoredWallet): Promise<TxResult> {
  try {
    const validators = await getStakingDelegations(wallet.address);
    if (validators.length === 0) return { success: true, note: 'No delegations — nothing to withdraw' };

    const client = await buildHubClient(wallet);
    const msgs = validators.map(v => ({
      typeUrl: WSTAKING_CLAIM_URL,
      value: { delegatorAddress: wallet.address, validatorAddress: v },
    }));

    const result = await client.signAndBroadcast(wallet.address, msgs, HUB_FEE, '');
    if (result.code === 0) return { success: true, txHash: result.transactionHash };

    return { success: false, error: `code ${result.code}: ${result.rawLog ?? ''}` };
  } catch (err: any) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export type SweepMode = 'all' | 'hub' | 'rollup' | 'staking';

export interface SweepStepResult {
  step: string;
  success: boolean;
  txHash?: string;
  error?: string;
  note?: string;
}

// Default minimum withdrawable staked MEC before attempting withdrawal: 0.0002 MEC = 20,000 umec.
// Configurable via MIN_STAKING_WITHDRAW_UMEC env var.
const DEFAULT_MIN_WITHDRAW_UMEC = parseInt(process.env.MIN_STAKING_WITHDRAW_UMEC ?? '20000', 10);

// Amount of gas to top up if a wallet is short (covers 1 hub tx fee of 10,000 umec + buffer).
const GAS_TOP_UP_UMEC = 20_000;

// Minimum hub balance required to broadcast a hub transaction (10,000 umec fee).
const TXN_FEE_UMEC = 12_000;

/**
 * Try to withdraw staking rewards for one wallet with smart gas top-up.
 *
 * Flow:
 *  1. Query withdrawable staked MEC rewards.
 *  2. If < minWithdrawableUmec → skip (do NOT fund gas).
 *  3. If >= minWithdrawableUmec:
 *     a. Check hub balance for gas.
 *     b. If sufficient → withdraw.
 *     c. If insufficient AND masterWallet provided → master sends gas → retry.
 */
async function smartStakingWithdraw(
  wallet: StoredWallet,
  minWithdrawableUmec: number,
  masterWallet?: StoredWallet,
): Promise<SweepStepResult[]> {
  const results: SweepStepResult[] = [];

  // Step 1: Check withdrawable balance
  const rewardsUmec = await getWstakingRewardsUmec(wallet.address);
  const rewardsMec  = (rewardsUmec / 1e8).toFixed(8);

  if (rewardsUmec < minWithdrawableUmec) {
    const threshMec = (minWithdrawableUmec / 1e8).toFixed(8);
    results.push({
      step: 'Check Withdrawable Staked MEC',
      success: true,
      note: `Rewards ${rewardsMec} MEC < threshold ${threshMec} MEC — skipped (no gas funded)`,
    });
    return results;
  }

  results.push({
    step: 'Check Withdrawable Staked MEC',
    success: true,
    note: `Rewards ${rewardsMec} MEC ≥ threshold — proceeding`,
  });

  // Step 2: Check hub gas balance
  const hubBalance = await getHubBalance(wallet.address);

  if (hubBalance >= TXN_FEE_UMEC) {
    // Sufficient gas — withdraw directly
    results.push({
      step: 'Gas Check',
      success: true,
      note: `Hub balance ${(hubBalance / 1e6).toFixed(4)} MEC — sufficient for fees`,
    });
    results.push({ step: 'Withdraw Staking Rewards', ...await withdrawStakingRewards(wallet) });
    return results;
  }

  // Insufficient gas
  if (!masterWallet) {
    results.push({
      step: 'Gas Check',
      success: false,
      error: `Hub balance ${(hubBalance / 1e6).toFixed(4)} MEC insufficient for fees (need ≥${(TXN_FEE_UMEC / 1e6).toFixed(4)} MEC). Set a Master Wallet to auto-fund gas.`,
    });
    return results;
  }

  // Step 3: Master wallet funds gas
  results.push({
    step: 'Gas Check',
    success: true,
    note: `Hub balance ${(hubBalance / 1e6).toFixed(4)} MEC insufficient — Master Wallet sending ${GAS_TOP_UP_UMEC / 1e6} MEC gas`,
  });

  const gasResult = await hubSend(masterWallet, wallet.address, GAS_TOP_UP_UMEC);
  results.push({ step: 'Fund Gas (Master Wallet)', ...gasResult });

  if (!gasResult.success) {
    results.push({
      step: 'Withdraw Staking Rewards',
      success: false,
      error: 'Skipped — gas funding failed',
    });
    return results;
  }

  // Wait a moment for the hub to register the new balance
  await new Promise(r => setTimeout(r, 4000));

  // Step 4: Retry withdrawal
  results.push({ step: 'Withdraw Staking Rewards', ...await withdrawStakingRewards(wallet) });
  return results;
}

export async function autoSweep(
  wallet: StoredWallet,
  mode: SweepMode,
  destination: string,
  minHubReserveUmec: number,
  network = 'mainnet',
  masterWallet?: StoredWallet,
  minWithdrawableUmec = DEFAULT_MIN_WITHDRAW_UMEC,
): Promise<SweepStepResult[]> {
  const results: SweepStepResult[] = [];
  const push = (step: string, r: TxResult) => results.push({ step, ...r });

  // ── Staking-only: smart withdraw with threshold + conditional gas top-up ──
  if (mode === 'staking') {
    const steps = await smartStakingWithdraw(wallet, minWithdrawableUmec, masterWallet);
    results.push(...steps);
    return results;
  }

  // ── Rollup-only ──────────────────────────────────────────────────────────
  if (mode === 'rollup') {
    push('Sweep Rollup Balance', await rollupSendAll(wallet, destination, network));
    return results;
  }

  // ── Hub-only ─────────────────────────────────────────────────────────────
  if (mode === 'hub') {
    const hubBalance = await getHubBalance(wallet.address);
    const available  = hubBalance - minHubReserveUmec - TXN_FEE_UMEC;
    if (available > 0) {
      push('Sweep Hub Balance', await hubSend(wallet, destination, available));
    } else {
      push('Sweep Hub Balance', {
        success: false,
        error: `Hub balance ${(hubBalance / 1e6).toFixed(4)} MEC is below reserve + fee (${((minHubReserveUmec + TXN_FEE_UMEC) / 1e6).toFixed(4)} MEC minimum)`,
      });
    }
    return results;
  }

  // ── All-inclusive: staking → hub sweep → rollup sweep ────────────────────
  // 1. Smart staking withdrawal (threshold check + conditional gas top-up)
  const stakingSteps = await smartStakingWithdraw(wallet, minWithdrawableUmec, masterWallet);
  results.push(...stakingSteps);

  // 2. Hub sweep (after staking rewards have landed)
  const hubBalance = await getHubBalance(wallet.address);
  const available  = hubBalance - minHubReserveUmec - TXN_FEE_UMEC;
  if (available > 0) {
    push('Sweep Hub Balance', await hubSend(wallet, destination, available));
  } else {
    push('Sweep Hub Balance', {
      success: true,
      note: `Hub balance ${(hubBalance / 1e6).toFixed(4)} MEC at or below reserve + fee — skipped`,
    });
  }

  // 3. Rollup sweep
  push('Sweep Rollup Balance', await rollupSendAll(wallet, destination, network));

  return results;
}
