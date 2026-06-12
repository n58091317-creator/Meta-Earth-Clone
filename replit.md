# Meta Earth Check-in Bot

A daily check-in automation bot for the Meta Earth blockchain, plus all openmetaearth GitHub repos cloned locally for reference.

## Run & Operate

- `pnpm --filter @workspace/meta-earth-checkin run dev` — start the bot (runs immediately + schedules daily cron)
- `pnpm --filter @workspace/meta-earth-checkin run checkin-now` — one-off check-in right now
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `PRIVATE_KEY` or `MNEMONIC` — wallet credential

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Bot: `@cosmjs/stargate` + `@cosmjs/proto-signing`, `node-cron`
- Message encoding: `protobufjs ^7.4.0` (dynamically defined types)

## Where things live

- `meta-earth-checkin/src/index.ts` — bot entry point / cron scheduler
- `meta-earth-checkin/src/checkin.ts` — MsgCheckIn transaction logic (the actual check-in)
- `meta-earth-checkin/src/wallet.ts` — wallet derivation from private key or mnemonic
- `meta-earth-checkin/src/logger.ts` — timestamped logger
- `meta-earth-checkin/.env.example` — env var template
- `repos/` — all 9 openmetaearth GitHub repos (shallow clones)

## Architecture decisions

- **Daily check-in is `/stchain.rollapp.checkin.MsgCheckIn`** on the **rollup chain** (`mecheckin_101-1`) via `broadcastTxAsync`. Confirmed from live rollup mempool inspection 2026-06-10 — ALL real bots in the mempool use this exact type URL with 2 fields.
- **MsgCheckIn fields** (2 only): `checkInAddress` (1, wallet address), `checkInMessage` (2, e.g. `"META EARTH! ME, My Way!"`). NO timezone field — real mempool txs have 2 fields only.
- The rollup chain stopped producing blocks on 2026-05-01, but its **mempool still accepts transactions**. The Meta Earth backend records check-ins from mempool acceptance — `broadcastTxAsync` is sufficient.
- **Rollup RPC**: `http://118.175.0.247:23011` (chain ID `mecheckin_101-1`, prefix `me`, REST port `23013`).
- **Rollup fee**: zero — custom `fee_checker.go` has no minimum fee requirement. Gas limit: `200 000`.
- **Broadcast mode**: `broadcastTxAsync` — bypasses CheckTx so zero-fee txs are accepted by the mempool.
- Bot uses `@cosmjs/stargate` + `@cosmjs/proto-signing` + `@cosmjs/tendermint-rpc` directly.
- `protobufjs` overridden to `^7.4.0` in `pnpm-workspace.yaml` — version 6.x blocked by Replit security policy.
- **Hub chain (me-hub)**: RPC `http://118.175.0.247:16657` (chain ID `me-chain`). Has `wstaking` module with `MsgNewRecord` — this is the **Show E task** module, **NOT daily check-in**. Using `MsgNewRecord` for check-in triggers "Show E" in the Meta Earth app, not "Daily Sign-in".
- **Hub `mechain.checkin.MsgCheckIn`**: Defined in the `meta-earth` proto repo but NOT compiled into the running me-hub binary. The hub has no `checkin` module in `x/`.

## Product

Daily check-in bot that signs and broadcasts a `MsgCheckIn` transaction on the Meta Earth rollup chain (`mecheckin_101-1`) via `broadcastTxAsync` on a configurable cron schedule. Supports multiple wallets via numbered `PRIVATE_KEY_1`, `PRIVATE_KEY_2`, ... or `MNEMONIC_1`, `MNEMONIC_2`, ... secrets.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Correct rollup check-in type URL is `/stchain.rollapp.checkin.MsgCheckIn`** with **2 fields**: `checkInAddress` (1), `checkInMessage` (2). NO timezone. Confirmed from live rollup mempool inspection 2026-06-10 — all real bots use this exact format.
- **DO NOT use `/metaearth.wstaking.MsgNewRecord` for check-in** — that is the "Show E" task module on the hub chain. Sending `MsgNewRecord` triggers "Show E" in the Meta Earth app, not "Daily Sign-in".
- **DO NOT use `/mechain.checkin.MsgCheckIn`** (3-field proto from meta-earth repo) — the hub has no compiled `checkin` module; the rollup is dead and this type is not processed.
- **Use `broadcastTxSync` for rollup txs** — the node's min gas price is 0, so fee=0 txs pass CheckTx fine. Sync gives us the real CheckTx result (error code + log) instead of silently dropping the tx.
- **Sequence mismatch (code 32)** — the mempool is permanently full at 5000 txs (no blocks since 2026-05-01). A wallet's first check-in tx (sequence 0) stays in the mempool forever. Subsequent check-ins get "expected 1, got 0". The code parses the expected sequence from the error and retries automatically. This is handled in both `checkin.ts` and `blockchain.ts`.
- **Fee structure** — use `ibc/BC7F4D581D...CBC5` denom with amount `"0"` and gas `500000` (matches real bots in mempool). Empty fee arrays also work but may be deprioritized.
- **Testnet rollup REST port is `3317`** (not `46660`) — confirmed from `repos/meta-earth-js-sdk/src/config/define.ts`.
- `meta-earth-js-sdk` is not published on npm — use local clone in `repos/meta-earth-js-sdk/` for reference, or depend on cosmjs directly.
- `protobufjs@6.x` is blocked by Replit security policy; override to `^7.4.0` is set in `pnpm-workspace.yaml`.
- The chain at port 26657 on `118.175.0.247` is a separate `gc_20-1` chain (prefix `gc`), NOT the me-hub. The me-hub RPC is at port `16657`.
- Dashboard rollup balance queries `ibc/BC7F4D...` denom (IBC-bridged umec); `urax` is the rollup's native staking denom and is unrelated to MEC balance.

## Secrets to set in Replit

| Secret | Value |
|--------|-------|
| `PRIVATE_KEY` | Your hex private key (or use MNEMONIC) |
| `NETWORK` | `mainnet` or `testnet` |
| `RUN_ON_START` | `true` |
| `CRON_SCHEDULE` | `0 8 * * *` (08:00 UTC daily, optional) |
| `CHECK_IN_MESSAGE` | Custom check-in message (optional, defaults to `META EARTH! ME, My Way!`) |

## Dashboard login (Replit Auth)

The dashboard is protected by **Replit OIDC**. Login redirects through `/api/login` → `/api/callback`. Sessions are stored in PostgreSQL (`sessions` table). No email/password form — Replit handles authentication.

- Wallet private keys/mnemonics stay in PostgreSQL — never sent externally
- Session secret stored as `SESSION_SECRET` Replit secret

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- RPC config source: `repos/meta-earth-js-sdk/src/config/define.ts`
- MsgNewRecord source: `repos/me-hub/x/wstaking/keeper/msg_server_record.go`
