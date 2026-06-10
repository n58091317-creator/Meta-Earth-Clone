---
name: Hub MsgNewRecord is NOT a check-in
description: MsgNewRecord on me-chain wstaking is a staking record, NOT daily check-in. The active daily check-in is rollup MsgCheckIn. Hub mechain.checkin.MsgCheckIn is not compiled into the running binary.
---

## Rule
Do NOT use `MsgNewRecord` on the hub or `mechain.checkin.MsgCheckIn` on the hub for daily check-in.

**Why:**
- `/metaearth.wstaking.MsgNewRecord` on hub (`me-chain`) is a staking record entry with no check-in reward.
- `/mechain.checkin.MsgCheckIn` is defined in the `meta-earth` repo but NOT compiled into the live `me-hub` binary at port 16657 — returns `unable to resolve type URL /mechain.checkin.MsgCheckIn: tx parse error` (code 2).
- The actual daily check-in is `/stchain.rollapp.checkin.MsgCheckIn` on the rollup chain. Confirmed from successful tx (explorer: `netType=rollapp_checkin`).

**How to apply:** Any check-in code must use the rollup chain (RPC `http://118.175.0.247:23011`, chain ID `mecheckin_101-1`) with `broadcastTxAsync`, type URL `/stchain.rollapp.checkin.MsgCheckIn`, 2 fields only. See `rollup-checkin-fields.md`.
