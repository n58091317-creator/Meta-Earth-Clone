---
name: Meta Earth check-in mechanism
description: The real on-chain daily check-in action and why MsgCheckin is wrong
---

## Rule
The daily check-in is `/metaearth.wstaking.MsgNewRecord` on the **me-hub chain** (RPC `http://118.175.0.247:16657`, chain ID `me-chain`, address prefix `me`).

There is NO `MsgCheckin` module on the live me-hub chain. A `checkin` module exists only in the `meta-earth` repo targeting a separate `gc_20-1` chain (prefix `gc`) where the user wallet has no funds.

## Fields
- `actionNumber` (proto field 1): alphanumeric only, e.g. `DailyCheckIn20260606` (date-unique)
- `actionUrl` (proto field 2): non-empty URL, e.g. `https://metaearth.io`
- `from` (proto field 3): wallet address (signer)

## Fee
The chain enforces a minimum of **10,000 umec** regardless of actual gas used. Use a fixed fee of 12,000 umec with gas_limit 500,000. Do NOT use `auto` — it estimates gas*price which comes in under the minimum.

## Why
`auto` gas estimation returned ~3,900 umec (correct for actual gas used ~75k) but the chain has a flat minimum fee of 10,000 umec. Real on-chain txs use gas_limit=500,000, fee=~10,000-11,000 umec.

## Chain topology (mainnet 118.175.0.247)
- Port 16657 (RPC) / 11317 (REST): me-hub chain, `me-chain`, prefix `me` — where wallets live and MsgNewRecord is submitted
- Port 26657 (RPC) / 1317 (REST): `gc_20-1` chain, prefix `gc` — separate chain, unrelated to the daily check-in bot

## How to apply
Any time this bot is modified or a new check-in message type is considered, start from `MsgNewRecord` in `wstaking` on me-hub. Confirmed working with TX `C2B8D30045449EFFC1E9A46E878F97946D31C2EAD398BFF34D360A9E6CCEB681`.
