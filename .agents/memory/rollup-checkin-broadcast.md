---
name: Rollup check-in broadcast & fee
description: How to broadcast rollup MsgCheckIn transactions without fee failures — use broadcastTxAsync + zero-fee array
---

The rollup chain (`mecheckin_101-1`) runs with `minGasPrices = "0.001umec"`. The custom `openroll/app/fee_checker.go` validates fees ONLY during `ctx.IsCheckTx()`. During `DeliverTx` (block inclusion) the function skips validation and just computes priority.

**Rule:** Use `broadcastTxAsync` + empty fee array (`amount: []`) for all rollup transactions.

**Why:** `broadcastTxSync` and `broadcastTxCommit` trigger CheckTx, where the fee checker enforces either ≥10000 IBC-MEC units OR the native `umec` minGasPrice fee. Wallets typically have 0 IBC MEC on the rollup, so CheckTx always fails. `broadcastTxAsync` skips CheckTx entirely; the tx goes straight into the block pipeline where no fee check runs.

**How to apply:** In `artifacts/dashboard/server/blockchain.ts` and `meta-earth-checkin/src/checkin.ts`, `ROLLUP_FEE = { amount: [], gas: '200000' }` and all broadcasts use `tmClient.broadcastTxAsync({ tx: txBytes })`. Do NOT switch to sync or commit mode.

**Confirmed working:** All 3 wallets checked in successfully with async+zero-fee after this change (2026-06-07).
