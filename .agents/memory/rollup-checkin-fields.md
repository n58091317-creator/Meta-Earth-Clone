---
name: Rollup MsgCheckIn — correct type URL and fields
description: The correct daily check-in uses /stchain.rollapp.checkin.MsgCheckIn with 2 fields on the rollup via broadcastTxAsync. Confirmed from live mempool inspection.
---

## Rule
Daily check-in: **`/stchain.rollapp.checkin.MsgCheckIn`** with **2 fields only** on rollup chain (`mecheckin_101-1`), broadcast via `broadcastTxAsync`.

**Confirmed from live rollup mempool inspection (2026-06-10):**
- Decoded 5 real bot transactions sitting in the mempool
- ALL use type URL `/stchain.rollapp.checkin.MsgCheckIn`
- ALL have exactly 2 fields: `checkInAddress` (1) + `checkInMessage` (2)
- NO timezone field
- Fee: zero / IBC MEC amount "0"

**Why:**
- The 3-field `/mechain.checkin.MsgCheckIn` type from `repos/meta-earth/proto/mechain/checkin/tx.proto` is NOT what real clients send. Live mempool shows the 2-field `/stchain.rollapp.checkin.MsgCheckIn`.
- The rollup stopped producing blocks 2026-05-01 but mempool still accepts txs. The Meta Earth backend records check-ins from mempool acceptance (broadcastTxAsync result is sufficient).
- `/metaearth.wstaking.MsgNewRecord` is the Show E module — completely different task, wrong for check-in.

**How to apply:**
- typeUrl: `/stchain.rollapp.checkin.MsgCheckIn`
- fields: `checkInAddress` (wallet address), `checkInMessage` (e.g. "META EARTH! ME, My Way!")
- fee: `{ amount: [], gas: '200000' }` (zero fee)
- broadcast: `Tendermint37Client.broadcastTxAsync` (not signAndBroadcast)
- chain: rollup RPC `http://118.175.0.247:23011`, chain ID `mecheckin_101-1`
