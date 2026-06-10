---
name: Rollup check-in is dead — use hub MsgNewRecord
description: Rollup chain stalled 2026-05-01, no new blocks. Do not use rollup for check-in. See hub-checkin-msgnewrecord.md for the active method.
---

## Rule
Do NOT submit check-in transactions to the rollup chain (`mecheckin_101-1`, port 23011).

**Why:**
- The rollup stopped producing blocks on 2026-05-01 (last block height 18600981).
- Mempool accepts transactions and returns a hash, but txs are never included in a block.
- The Meta Earth explorer cannot find mempool-only tx hashes — they appear to the user as non-existent.
- `broadcastTxAsync` was a workaround for CheckTx fee enforcement; it is no longer relevant since the rollup is dead.

**How to apply:**
- See `hub-checkin-msgnewrecord.md` for the active check-in implementation.
- The rollup RPC/REST endpoints can still be used for balance queries and token transfers (if the chain ever resumes), but not for check-in.
