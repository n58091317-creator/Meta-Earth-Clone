---
name: Active daily check-in is MsgNewRecord on hub
description: The rollup stalled 2026-05-01. All active daily check-ins use MsgNewRecord on the hub chain (me-chain) with actionNumber "MEcheckin"+YYYYMMDD.
---

## Rule
Daily check-in must use `/metaearth.wstaking.MsgNewRecord` on the **hub chain** (`me-chain`, RPC `http://118.175.0.247:16657`), NOT the rollup.

**Why:**
- The rollup chain (`mecheckin_101-1`, port 23011) stopped producing blocks on 2026-05-01. Transactions submitted there go to mempool but are never included in a block and never appear in any explorer.
- The hub chain is live (blocks confirmed in real time, e.g. height 13344293+ on 2026-06-10).
- Confirmed from live on-chain txs: active daily check-ins use `MsgNewRecord` on the hub with `actionNumber: "MEcheckin20260610"` (MEcheckin + YYYYMMDD).

**Correct check-in fields (confirmed from live txs):**
- typeUrl: `/metaearth.wstaking.MsgNewRecord`
- `actionNumber`: `"MEcheckin" + YYYYMMDD` (UTC date, e.g. `"MEcheckin20260610"`)
- `actionUrl`: `"https://metaearth.network"` (configurable via `CHECKIN_URL` env)
- `from`: wallet address
- fee: `10000 umec`, gas `500000`
- broadcast: `signAndBroadcast` (hub produces blocks — tx is confirmed on-chain)

**How to apply:**
- Any check-in code must connect to `http://118.175.0.247:16657` (me-chain hub).
- Use `SigningStargateClient.connectWithSigner` (not Tendermint37Client + broadcastTxAsync).
- actionNumber changes each day — always generate it at runtime as `"MEcheckin" + UTC YYYYMMDD`.
- Do NOT submit check-ins to the rollup RPC (port 23011) — the chain is dead.
- "ShowtheE..." actionNumbers are a different Meta Earth task (Show the E), NOT daily check-in.
