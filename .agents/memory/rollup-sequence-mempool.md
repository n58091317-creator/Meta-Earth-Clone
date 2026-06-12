---
name: Rollup sequence mismatch & mempool full
description: The rollup mempool is permanently full at 5000 txs; broadcastTxAsync silently drops txs; use broadcastTxSync + sequence retry.
---

## The Rule

Always use `broadcastTxSync` for rollup check-in txs. After broadcasting, handle code 32 (sequence mismatch) by parsing "expected N" from the error log and retrying once with sequence N.

**Why:** The rollup stopped producing blocks on 2026-05-01. The mempool is permanently full at exactly 5000 txs with ~1.7 MB. `broadcastTxAsync` returns a hash immediately (computed locally) but the tx silently fails CheckTx asynchronously if the mempool is full or sequence is wrong — the caller sees ✅ but nothing entered the mempool.

A fresh wallet has on-chain sequence=0, but a previous check-in attempt (sequence 0) is already pending in the mempool. The chain's CheckTx responds with code 32 + "expected 1, got 0". Parse the expected number and retry once.

**How to apply:**
1. Call `broadcastTxSync` instead of `broadcastTxAsync`
2. If `res.code === 32`, extract N from `res.log.match(/expected\s+(\d+)/i)`
3. Re-sign and re-broadcast with sequence N
4. Only treat `code === 0` as success

## Fee structure (confirmed from live mempool 2026-06-12)

Real bots use:
- `amount: [{ denom: "ibc/BC7F4D581D88785A22824C8FB6807DFC3B65C1764AFF1230D954AAB06B70CBC5", amount: "0" }]`
- `gas: "500000"`

Empty fee arrays (`amount: []`) also work (min gas price = 0 on this node), but the IBC denom with amount "0" matches the canonical format.

## fee_checker.go behavior (confirmed from openroll source)

- Relayers (`regionKeeper.GetRelayer`) → priority 99, bypass all fee checks
- IBC fee ≥ 10,000 umec → gets priority + passes CheckTx
- If `minGasPrices = 0` (this node's config) → any fee (including 0) passes CheckTx
- Empty fee → priority 0; IBC fee amount "0" → priority 0 (same)

## Mempool state (as of 2026-06-12)

- 5000 txs, 1,706,608 bytes (static — no blocks draining it)
- All txs are MsgCheckIn from other bots, fee=ibc/BC7F4D... amount=0
- Our wallet can get in because CheckTx passes (min gas = 0), but daily re-submission requires incrementing the pending sequence
