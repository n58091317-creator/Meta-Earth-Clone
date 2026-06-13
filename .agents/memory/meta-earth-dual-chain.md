---
name: Meta Earth dual-chain ecosystem
description: Two separate Cosmos chain ecosystems at 118.175.0.247 (old) and 118.175.0.249 (new); wallet activation requirement on new chain; bot fallback strategy.
---

## Rule
Bot must try the NEW rollup first, fall back to OLD rollup if wallet not activated.

**Why:** Meta Earth migrated to a completely new set of chains (new hub + new rollup) with a fresh genesis of ~80 accounts. Wallets not in genesis get code-9 ("fee payer does not exist") on the new rollup. The old rollup is dead (no blocks since 2026-05-01) but its mempool still accepts txs and may still be read by the Meta Earth backend for legacy users.

**How to apply:**
- `checkin.ts`: `checkinOnChain()` → try NEW_ROLLUP_RPC, if returns null try OLD_ROLLUP_RPC
- `blockchain.ts`: `rollupBroadcastToChain()` → same pattern in `rollupBroadcast()`

## Chain topology (confirmed 2026-06-12)

### Old ecosystem (118.175.0.247)
- Hub `me-chain` port `16657`, REST `11317` — has wstaking module, wallet has 2000 umec / seq 50
- Rollup `mecheckin_101-1` port `23011`, REST `23013` — dead (no blocks), mempool at 5000 txs
- IBC: hub channel-1 → rollup channel-0; hub channel-0 → me-da chain (unrelated)

### New ecosystem (118.175.0.249)
- Hub `mechain_400-1` port `26657`, REST `1317` — ~80 genesis accounts, 200000000 umec each
- Rollup `mecheckin_401-1` port `46657`, REST `3317` — alive, producing real blocks
- IBC: new hub channel-1 → new rollup channel-0 (new rollup's IBC denom = `ibc/BC7F4D...` = umec via `transfer/channel-0`)
- Old rollup bot addresses (me1xp80f...) are NOT present on new chains

## Wallet activation
Wallets NOT in new hub genesis can get tokens via faucet at https://www.mec.me/en-US/faucet.
The faucet sends umec to the **new hub (mechain_400-1)**, NOT to the rollup directly.
- Confirmed 2026-06-13: wallet `me1wn7kk6dek49fmm6ujcytafjwgcu6txmehqqfv0` has 200M umec on new hub.
- To activate on rollup: IBC transfer from new hub channel-1 → new rollup channel-0 creates the rollup account.
- Even a tiny IBC transfer (10000 umec) is sufficient — check-in fee on new rollup is 0 (empty fee array).
- Both `checkin.ts` (bot) and `blockchain.ts` (dashboard) now auto-bridge when wallet has no rollup account.

## Critical IBC bug (fixed 2026-06-13)
`ibcTransferToRollup()` was using `HUB_RPC` (old hub at 118.175.0.247:16657) which has NO open channel to the new rollup. It MUST use `NEW_HUB_RPC` (118.175.0.249:26657). The old hub and new hub are COMPLETELY SEPARATE chains.

## Fee structure on new rollup
Real check-in txs on mecheckin_401-1 use empty fee array `[]` + gas `500000`.
The fee_checker.go has no minimum gas price requirement.
