---
name: Rollup broadcastTxAsync — bypasses CheckTx fee enforcement
description: Use broadcastTxAsync for rollup txs. CheckTx enforces fees; DeliverTx does not. Rollup is stalled but mempool still works for check-in.
---

## Rule
Use `broadcastTxAsync` + zero fee for all rollup check-in transactions.

**Why:**
- The rollup's `fee_checker.go` validates fees only during `ctx.IsCheckTx()`. DeliverTx has no fee check.
- `broadcastTxSync` and `broadcastTxCommit` trigger CheckTx, where the fee checker enforces ≥10000 IBC-MEC units. Wallets typically have 0 IBC MEC on the rollup → CheckTx always fails.
- `broadcastTxAsync` skips CheckTx entirely; the tx goes straight into the mempool.
- The rollup stopped producing blocks 2026-05-01, but mempool acceptance IS sufficient — the Meta Earth backend records check-ins from the mempool.

**How to apply:**
- `ROLLUP_FEE = { amount: [], gas: '200000' }` (zero fee array, not 0-amount)
- Broadcast using `Tendermint37Client.broadcastTxAsync({ tx: txBytes })`
- The returned hash confirms mempool acceptance — no need to poll for block inclusion
- Rollup RPC: `http://118.175.0.247:23011`
