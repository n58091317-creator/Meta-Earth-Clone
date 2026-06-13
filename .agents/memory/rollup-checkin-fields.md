---
name: Rollup MsgCheckIn — correct type URL and fields
description: The correct daily check-in proto for the NEW rollup (mecheckin_401-1). Fields are creator/slogan/recoverInterruption — NOT checkInAddress/checkInMessage.
---

## Rule
Daily check-in: **`/stchain.rollapp.checkin.MsgCheckIn`** with **3 fields** on rollup chain, broadcast via `broadcastTxSync`.

**Confirmed from live rollup REST tx decode (2026-06-13):**
- Decoded real transactions via `GET /cosmos/tx/v1beta1/txs?events=message.action=...`
- Real tx JSON: `{ "@type": "/stchain.rollapp.checkin.MsgCheckIn", "creator": "me1...", "slogan": "META EARTH! ME, My Way!", "recover_interruption": false }`
- 3 fields in standard Ignite scaffold order: `creator` (1), `slogan` (2), `recover_interruption` (3, bool)
- Fee: empty amount array `[]`, gas `500000`

**Why the old 2-field version was wrong:**
- The previous memory entry (from 2026-06-10 mempool inspection) identified fields as `checkInAddress` + `checkInMessage` — this was incorrect
- The old rollup (`mecheckin_101-1`) was dead and its mempool txs may have been from older bot versions
- The NEW active rollup (`mecheckin_401-1`, alive as of 2026-06-13 at block 2,275,335) uses the Ignite-scaffolded 3-field format
- The meta-earth hub repo proto (`/mechain.checkin.MsgCheckIn`) uses `checkInAddress/checkInMessage/checkInTimezone` — this is the HUB type, NOT the rollup type

**How to apply:**
- typeUrl: `/stchain.rollapp.checkin.MsgCheckIn`
- protobufjs fields: `creator` (1, string), `slogan` (2, string), `recoverInterruption` (3, bool)
- message object: `{ creator: wallet.address, slogan: 'META EARTH! ME, My Way!', recoverInterruption: false }`
- fee: `{ amount: [], gas: '500000' }`
- broadcast: `broadcastTxSync` (gives real CheckTx code)
- chain: try NEW rollup first (`mecheckin_401-1` at `118.175.0.249:46657`), fall back to OLD (`mecheckin_101-1` at `118.175.0.247:23011`)
