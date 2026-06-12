import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
  OfflineSigner,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';
import { Tendermint37Client } from '@cosmjs/tendermint-rpc';
import { Type, Field, Root, Writer } from 'protobufjs';
import { StoredWallet } from './store';

const HUB_RPC = 'http://118.175.0.247:16657';
const HUB_REST = 'http://118.175.0.247:11317';
const ROLLUP_RPC: Record<string, string> = {
  mainnet: 'http://118.175.0.247:23011',
  testnet: 'http://118.175.0.249:46657',
};
const ROLLUP_REST: Record<string, string> = {
  mainnet: 'http://118.175.0.247:23013',
  testnet: 'http://118.175.0.249:3317',
};
const ROLLUP_CHAIN_ID: Record<string, string> = {
  mainnet: 'mecheckin_101-1',
  testnet: 'mecheckin_100-1',
};

// IBC: hub channel-1 → rollup channel-0
const IBC_HUB_CHANNEL    = 'channel-1';
const IBC_SOURCE_PORT    = 'transfer';
// IBC denom of hub MEC on the rollup chain
export const ROLLUP_IBC_DENOM =
  'ibc/BC7F4D581D88785A22824C8FB6807DFC3B65C1764AFF1230D954AAB06B70CBC5';

const HUB_FEE = { amount: [{ denom: 'umec', amount: '10000' }], gas: '500000' };
// Rollup fee: IBC MEC denom with amount "0" — matches what real check-in bots use in the mempool.
// Even though the rollup's fee_checker.go requires no minimum fee, specifying the IBC denom
// with amount "0" gives the tx the same priority as other bots, preventing mempool eviction
// when the mempool is full (5000 tx cap). Empty fee arrays get dropped when mempool is full.
// Gas 500000 matches real bots (confirmed from live mempool inspection).
const ROLLUP_FEE = {
  amount: [{ denom: 'ibc/BC7F4D581D88785A22824C8FB6807DFC3B65C1764AFF1230D954AAB06B70CBC5', amount: '0' }],
  gas: '500000',
};
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

// Check-in type URL — confirmed from live rollup mempool inspection (2026-06-10).
// Real bots in the mempool ALL use /stchain.rollapp.checkin.MsgCheckIn with 2 fields.
// DO NOT use /mechain.checkin.MsgCheckIn (3-field, hub-only) or
// /metaearth.wstaking.MsgNewRecord (Show E module — completely different task).
const CHECKIN_TYPE_URL = '/stchain.rollapp.checkin.MsgCheckIn';

// 2 fields only — confirmed from decoding real mempool txs on 2026-06-10.
// NO timezone field. The meta-earth proto has a 3-field version but live txs omit it.
function buildMsgCheckInType(): Type {
  const root = new Root();
  const T = new Type('MsgCheckIn')
    .add(new Field('checkInAddress', 1, 'string'))
    .add(new Field('checkInMessage', 2, 'string'));
  root.add(T);
  return T;
}
const MsgCheckInType = buildMsgCheckInType();

// MsgNewRecord — hub chain wstaking module (Show E task, NOT daily check-in).
// Fields confirmed from proto/metaearth/wstaking/record.proto and live tx inspection.
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

function buildWstakingWithdrawType(): Type {
  const root = new Root();
  const T = new Type('MsgWstakingWithdrawDelegatorReward')
    .add(new Field('delegatorAddress', 1, 'string'))
    .add(new Field('validatorAddress', 2, 'string'));
  root.add(T);
  return T;
}
const MsgWstakingWithdrawType = buildWstakingWithdrawType();

function buildWstakingUnstakeType(): Type {
  const root = new Root();
  const Coin = new Type('Coin')
    .add(new Field('denom', 1, 'string'))
    .add(new Field('amount', 2, 'string'));
  root.add(Coin);
  const T = new Type('MsgWstakingUnstake')
    .add(new Field('stakerAddress', 1, 'string'))
    .add(new Field('validatorAddress', 2, 'string'))
    .add(new Field('amount', 3, 'Coin'));
  root.add(T);
  return T;
}
const MsgWstakingUnstakeType = buildWstakingUnstakeType();

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

async function buildRollupClient(wallet: StoredWallet, network = 'mainnet') {
  const signer = await buildSigner(wallet);
  const rpc = ROLLUP_RPC[network] ?? ROLLUP_RPC.mainnet;
  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(CHECKIN_TYPE_URL, MsgCheckInType as any);
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
): Promise<{ code: number; log: string; hash: string }> {
  const signed = await client.sign(wallet.address, msgs, ROLLUP_FEE, memo, {
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

async function rollupBroadcast(
  wallet: StoredWallet,
  msgs: any[],
  memo = '',
  network = 'mainnet'
): Promise<TxResult> {
  try {
    const { tmClient, client } = await buildRollupClient(wallet, network);
    const chainId = ROLLUP_CHAIN_ID[network] ?? ROLLUP_CHAIN_ID.mainnet;

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
        permanent: true,
      };
    }

    // Attempt 1: broadcast with on-chain sequence
    let result = await signAndBroadcast(tmClient, client as any, wallet, msgs, memo, chainId, accountNumber, sequence);

    // Code 32 = sequence mismatch — the mempool already has a pending tx for this
    // wallet at this sequence (from a previous check-in that hasn't been delivered
    // because the rollup stopped producing blocks). Parse the expected sequence from
    // the error log and retry once with the correct value.
    if (result.code === 32) {
      const expectedSeq = parseExpectedSequence(result.log);
      if (expectedSeq !== null && expectedSeq !== sequence) {
        console.log(`[blockchain] Sequence mismatch for ${wallet.label}: expected ${expectedSeq}, retrying...`);
        result = await signAndBroadcast(tmClient, client as any, wallet, msgs, memo, chainId, accountNumber, expectedSeq);
      }
    }

    if (result.code !== 0) {
      return { success: false, error: `CheckTx code ${result.code}: ${result.log}` };
    }

    return { success: true, txHash: result.hash };
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

// ─── Daily check-in: MsgCheckIn on rollup via broadcastTxAsync ───────────────
// Type URL and fields confirmed from live rollup mempool inspection (2026-06-10):
//   ALL real bots use /stchain.rollapp.checkin.MsgCheckIn with 2 fields.
// The rollup stopped producing blocks 2026-05-01 but its mempool still accepts txs.
// The Meta Earth backend records check-ins from mempool acceptance.
// broadcastTxAsync bypasses CheckTx (which enforces fees) — DeliverTx has no fee check.
export async function performCheckin(wallet: StoredWallet, network = 'mainnet'): Promise<TxResult> {
  const msg = {
    typeUrl: CHECKIN_TYPE_URL,
    value: MsgCheckInType.fromObject({
      checkInAddress: wallet.address,
      checkInMessage: process.env.CHECK_IN_MESSAGE ?? 'META EARTH! ME, My Way!',
    }),
  };
  return rollupBroadcast(wallet, [msg], '', network);
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
