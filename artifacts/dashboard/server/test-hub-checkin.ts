/**
 * Test: broadcast MsgCheckIn to the old hub (me-chain at 118.175.0.247:16657)
 * The checkin module IS registered there (confirmed by abci_query code=0).
 * ValidateBasic requires checkInMessage === "ME, My Way!" exactly.
 */
import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet,
  Registry,
} from '@cosmjs/proto-signing';
import { SigningStargateClient, defaultRegistryTypes } from '@cosmjs/stargate';
import { Type, Field, Root, Writer } from 'protobufjs';
import { pool } from './db';
import { getWallets } from './store';

const HUB_RPC = 'http://118.175.0.247:16657';
const CHECKIN_TYPE_URL = '/mechain.checkin.MsgCheckIn';
const ADDRESS_PREFIX = 'me';
const HUB_CHAIN_ID = 'me-chain';

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

function encodeTxRaw(txRaw: { bodyBytes: Uint8Array; authInfoBytes: Uint8Array; signatures: Uint8Array[] }): Uint8Array {
  const w = new Writer();
  if (txRaw.bodyBytes?.length) w.uint32(10).bytes(txRaw.bodyBytes);
  if (txRaw.authInfoBytes?.length) w.uint32(18).bytes(txRaw.authInfoBytes);
  for (const sig of txRaw.signatures ?? []) w.uint32(26).bytes(sig);
  return w.finish();
}

async function main() {
  const wallets = await getWallets();
  const wallet2 = wallets.find(w => w.label.toLowerCase().includes('wallet 2')) ?? wallets[1];
  if (!wallet2) { console.error('No wallet 2'); process.exit(1); }

  console.log(`Testing hub check-in for: ${wallet2.label} (${wallet2.address})`);

  const signer = wallet2.privateKey
    ? await DirectSecp256k1Wallet.fromKey(Buffer.from(wallet2.privateKey, 'hex'), ADDRESS_PREFIX)
    : await DirectSecp256k1HdWallet.fromMnemonic(wallet2.mnemonic!, { prefix: ADDRESS_PREFIX });

  const registry = new Registry([...defaultRegistryTypes]);
  registry.register(CHECKIN_TYPE_URL, MsgCheckInType as any);

  const client = await SigningStargateClient.connectWithSigner(HUB_RPC, signer, { registry });

  const acct = await client.getSequence(wallet2.address);
  console.log(`Account: number=${acct.accountNumber}, sequence=${acct.sequence}`);

  const msg = {
    typeUrl: CHECKIN_TYPE_URL,
    value: MsgCheckInType.fromObject({
      checkInAddress:  wallet2.address,
      checkInMessage:  'ME, My Way!',  // MUST be exactly this per ValidateBasic
      checkInTimezone: 'UTC',
    }),
  };

  const fee = { amount: [{ denom: 'umec', amount: '10000' }], gas: '500000' };

  // Use signAndBroadcast (DeliverTx) since hub produces blocks
  const result = await client.signAndBroadcast(wallet2.address, [msg], fee, '');
  console.log('\nResult:');
  console.log('  code:', result.code);
  console.log('  txHash:', result.transactionHash);
  console.log('  rawLog:', result.rawLog?.slice(0, 300));

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
