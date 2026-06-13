---
name: Rollup MsgCheckIn — correct type URL and fields
description: Correct check-in proto for both rollups. NEW rollup uses /mechain.checkin.MsgCheckIn (confirmed from proto file). OLD rollup (dead fallback) uses /stchain.rollapp.checkin.MsgCheckIn.
---

## Rule
Daily check-in uses **different schemas** on new vs old rollup, broadcast via `broadcastTxSync`.

**NEW rollup (`mecheckin_401-1` at `118.175.0.249:46657`):**
- typeUrl: `/mechain.checkin.MsgCheckIn`
- Source: `repos/meta-earth/proto/mechain/checkin/tx.proto`
- Fields: `checkInAddress` (1, string), `checkInMessage` (2, string), `checkInTimezone` (3, string)
- Fee: `{ amount: [], gas: '500000' }` (no min gas price)

**OLD rollup fallback (`mecheckin_101-1` at `118.175.0.247:23011`) — dead, no blocks since 2026-05-01:**
- typeUrl: `/stchain.rollapp.checkin.MsgCheckIn`
- Fields: `creator` (1, string), `slogan` (2, string), `recoverInterruption` (3, bool)
- Fee: `{ amount: [{ denom: 'umec', amount: '500' }], gas: '500000' }` (min-gas-price enforced)

**Why:** The proto file in `repos/meta-earth/proto/mechain/checkin/tx.proto` definitively shows `/mechain.checkin.MsgCheckIn`. Earlier memory was wrong — it recorded a failed broadcast test result from 2026-06-13 where the wallet wasn't activated (code 9/2 could mean either type unknown OR account missing). The proto file is authoritative.

**How to apply:**
- New rollup message: `{ checkInAddress: wallet.address, checkInMessage: '...', checkInTimezone: 'UTC' }`
- Old rollup message: `{ creator: wallet.address, slogan: '...', recoverInterruption: false }`
- Chain ID: fetch from `GET <rpc>/status` → `result.node_info.network` before signing
- New wallets need testnet tokens first: `https://www.mec.me/en-US/faucet`

**Explorer:** `https://www.explorer-testnet.me/zh-TW/home`
