---
name: Rollup MsgCheckIn — correct type URL and fields
description: Correct check-in proto confirmed by Meta Earth team. /mechain.checkin.MsgCheckIn with checkInAddress/checkInMessage/checkInTimezone on the rollup.
---

## Rule
Daily check-in: **`/mechain.checkin.MsgCheckIn`** with **3 fields** on the official check-in rollup, broadcast via `broadcastTxSync`.

**Confirmed by Meta Earth technical team (2026-06-13):**
- Type URL: `/mechain.checkin.MsgCheckIn`
- Proto source: `repos/meta-earth/proto/mechain/checkin/tx.proto` (package `mechain.checkin`)
- 3 fields: `check_in_address` (1), `check_in_message` (2), `check_in_timezone` (3)
- In protobufjs (camelCase): `checkInAddress`, `checkInMessage`, `checkInTimezone`
- Example: `checkInAddress=me1...`, `checkInMessage="META EARTH! ME, My Way!"`, `checkInTimezone="UTC"`
- CLI example from repo: `check-in 'ME, My Way!' 'Asia/Shanghai'`
- Fee: `{ amount: [], gas: '500000' }` (zero fee — rollup has no min gas price)
- Chain ID: dynamically fetched from `/status` at broadcast time — team says `mecheckin_400-1` but live RPC at `118.175.0.249:46657` reports `mecheckin_401-1`; fetching dynamically handles both

**Why the previous entries were wrong:**
- `/stchain.rollapp.checkin.MsgCheckIn` with `creator/slogan/recoverInterruption` was decoded from old mempool txs (2026-06-10 and 2026-06-13) — those txs were from a different/older bot or a non-official rollup instance
- The official Meta Earth team explicitly confirmed `/mechain.checkin.MsgCheckIn` is the correct module
- The hub repo `meta-earth` has the authoritative proto at `proto/mechain/checkin/tx.proto`

**How to apply:**
- typeUrl: `/mechain.checkin.MsgCheckIn`
- protobufjs fields: `checkInAddress` (1, string), `checkInMessage` (2, string), `checkInTimezone` (3, string)
- message object: `{ checkInAddress: wallet.address, checkInMessage: '...', checkInTimezone: 'UTC' }`
- fee: `{ amount: [], gas: '500000' }`
- chain ID: fetch from `GET <rpc>/status` → `result.node_info.network` before signing
- RPC: `http://118.175.0.249:46657` (primary, from meta-earth-js-sdk config)
- Fallback: old rollup `mecheckin_101-1` at `http://118.175.0.247:23011`
- New wallets need testnet tokens from faucet: `https://www.mec.me/en-US/faucet`

**Explorer:** `https://www.explorer-testnet.me/zh-TW/home`
**Developer docs:** `https://docs.mec.me/docs/development-guides/developer-guide`
