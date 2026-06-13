---
name: Rollup MsgCheckIn — correct type URL and fields
description: Correct check-in proto for both rollups. /stchain.rollapp.checkin.MsgCheckIn with creator/slogan/recoverInterruption — confirmed by live broadcast test 2026-06-13.
---

## Rule
Daily check-in: **`/stchain.rollapp.checkin.MsgCheckIn`** with **3 fields** on BOTH rollups, broadcast via `broadcastTxSync`.

**Confirmed by live broadcast test 2026-06-13:**
- NEW rollup (`mecheckin_401-1` at `118.175.0.249:46657`): accepts `/stchain.rollapp.checkin.MsgCheckIn` (code 9 = account not found, type IS registered). Returns code 2 for `/mechain.checkin.MsgCheckIn` (type NOT registered).
- OLD rollup (`mecheckin_101-1` at `118.175.0.247:23011`): also uses `/stchain.rollapp.checkin.MsgCheckIn`

**Fields:**
- `creator` (1, string) — wallet address
- `slogan` (2, string) — check-in message e.g. `"META EARTH! ME, My Way!"`
- `recoverInterruption` (3, bool) — always `false`

**Why `/mechain.checkin.MsgCheckIn` is WRONG (despite team saying otherwise):**
- The Meta Earth technical team (2026-06-13) said `/mechain.checkin.MsgCheckIn` is correct
- BUT live broadcast to the actual new rollup returns code 2 (unable to resolve type URL)
- The live new rollup DOES accept `/stchain.rollapp.checkin.MsgCheckIn` (code 9 = type known, account missing)
- Trust the live chain over the team's statement

**How to apply:**
- typeUrl: `/stchain.rollapp.checkin.MsgCheckIn`
- protobufjs fields: `creator` (1, string), `slogan` (2, string), `recoverInterruption` (3, bool)
- message object: `{ creator: wallet.address, slogan: '...', recoverInterruption: false }`
- fee (new rollup): `NEW_ROLLUP_FEE = { amount: [], gas: '500000' }`
- fee (old rollup): `OLD_ROLLUP_FEE = { amount: [{ denom: 'umec', amount: '500' }], gas: '500000' }`
- chain ID: fetch from `GET <rpc>/status` → `result.node_info.network` before signing
- RPC: `http://118.175.0.249:46657` (primary)
- Fallback: old rollup `mecheckin_101-1` at `http://118.175.0.247:23011`
- New wallets need account on new rollup first — fund via faucet: `https://www.mec.me/en-US/faucet`

**Old rollup fee situation:**
- Old rollup enforces min-gas-price 0.001umec → requires 500 umec fee
- Code 13 = insufficient fees, code 9 = account not found
- Only wallets WITH umec on old rollup can check in there

**Explorer:** `https://www.explorer-testnet.me/zh-TW/home`
