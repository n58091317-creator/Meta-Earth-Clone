---
name: Rollup MsgCheckIn — correct type URL and fields
description: BOTH live rollups use /stchain.rollapp.checkin.MsgCheckIn. /mechain.checkin.MsgCheckIn is NOT registered on any live chain. Confirmed by live chain testing 2026-06-13.
---

## Rule
**Both rollups use the same type URL:** `/stchain.rollapp.checkin.MsgCheckIn`

Fields (same on both rollups):
- `creator` (1, string) — wallet address
- `slogan` (2, string) — check-in message, must be `"ME, My Way!"` (default)
- `recoverInterruption` (3, bool) — always `false`

**NEW rollup (`mecheckin_401-1` at `118.175.0.249:46657`)** — ALIVE, produces blocks:
- Fee: `{ amount: [], gas: '500000' }` (no min gas price)
- Test result: stchain type → code 9 (account not found = type IS registered + parsed correctly)
- Test result: mechain type → code 2 (type NOT registered)

**OLD rollup (`mecheckin_101-1` at `118.175.0.247:23011`)** — dead, no blocks since 2026-05-01:
- Fee: `{ amount: [{ denom: 'umec', amount: '500' }], gas: '500000' }` (min-gas-price enforced)
- Accepts txs (code 0) but never confirms

**Why:** Live testing on 2026-06-13 proved definitively: new rollup returns code 9 (not code 2) for `/stchain.rollapp.checkin.MsgCheckIn`, meaning the type IS registered and bytes ARE correctly parsed. Returns code 2 for `/mechain.checkin.MsgCheckIn`. The `meta-earth` repo proto defines the future type but it's not deployed on live chains yet.

**Broadcast strategy (critical):**
- **NEW rollup (alive):** use `SigningStargateClient.connectWithSigner(rpc, signer, { registry })` + `client.signAndBroadcast(address, [msg], fee)` — this waits for real DeliverTx block confirmation. Auto-fetches sequence, no manual sequence handling needed. Pattern from openroll ts-client module.ts.
- **OLD rollup (dead):** use `Tendermint37Client.connect` + `SigningStargateClient.createWithSigner` + manual `client.sign` + `broadcastTxSync` — only does CheckTx, never gets block confirmation. Also handles code-32 sequence mismatch via retry.
- `prefix` is NOT a valid `SigningStargateClientOptions` field — it's embedded in the signer itself (created with `ADDRESS_PREFIX`).

**How to apply:**
- Use `CHECKIN_TYPE_URL` (`/stchain.rollapp.checkin.MsgCheckIn`) on BOTH rollups
- Message value: `{ creator: wallet.address, slogan: 'ME, My Way!', recoverInterruption: false }`
- Try new rollup first with `signAndBroadcast`, fall back to old rollup with `broadcastTxSync`
- Chain ID: fetch from `GET <rpc>/status` → `result.node_info.network` before signing
- Wallets need testnet tokens first: `https://www.mec.me/en-US/faucet`
