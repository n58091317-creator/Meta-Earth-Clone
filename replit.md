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

- **Daily check-in is `/mechain.checkin.MsgCheckIn`** on the rollup chain via `broadcastTxSync`. Confirmed by Meta Earth technical team 2026-06-13. Source proto: `repos/meta-earth/proto/mechain/checkin/tx.proto`.
- **MsgCheckIn fields** (3 fields): `checkInAddress` (1, wallet address), `checkInMessage` (2, e.g. `"META EARTH! ME, My Way!"`), `checkInTimezone` (3, string e.g. `"UTC"`).
- **Chain ID is fetched dynamically** from the rollup RPC `/status` endpoint at broadcast time. The rollup at `118.175.0.249:46657` currently reports `mecheckin_401-1` but the official chain ID confirmed by the team is `mecheckin_400-1`. Dynamic fetch ensures the correct signing chain ID is always used.
- **Dual-chain strategy**: Bot fetches chain ID from new rollup first, falls back to old rollup if wallet not activated.
  - **NEW rollup** at `118.175.0.249:46657` — alive, producing real blocks. Hub: `mechain_400-1` at `118.175.0.249:26657` (public: `https://beta-hub-26657.explorer-testnet.me`). New wallets must get testnet tokens from faucet: `https://www.mec.me/en-US/faucet`.
  - **OLD rollup** `mecheckin_101-1` at `118.175.0.247:23011` — dead (no blocks since 2026-05-01), mempool permanently full at 5000 txs. Still accepts new txs (code=0). Used as fallback.
- **Wallet activation**: New wallets need testnet tokens before they can check in. Use faucet: `https://www.mec.me/en-US/faucet`.
- **Old rollup**: wallet CAN submit (sequence handled via code-32 retry), used as fallback until activation.
- **Fee**: empty amount array `[]` + gas `500000` for rollup txs (confirmed from real new-chain txs 2026-06-12).
- **Broadcast mode**: `broadcastTxSync` — gives real CheckTx result including sequence mismatch (code 32) and account-not-found (code 9).
- Bot uses `@cosmjs/stargate` + `@cosmjs/proto-signing` + `@cosmjs/tendermint-rpc` directly.
- `protobufjs` overridden to `^7.4.0` in `pnpm-workspace.yaml` — version 6.x blocked by Replit security policy.
- **Old hub** `me-chain` at `118.175.0.247:16657`: has `wstaking` module with `MsgNewRecord` — this is the **Show E task** module, **NOT daily check-in**. Our wallet has 2000 umec here (seq 50). NOT connected to new rollup via IBC.
- **New hub** `mechain_400-1` at `118.175.0.249:26657`: ~80 genesis accounts each with 200000000 umec. IBC channel-1 → new rollup channel-0. Our wallet NOT in genesis.

## Product

Daily check-in bot that signs and broadcasts a `MsgCheckIn` transaction. Tries new rollup (`mecheckin_401-1`) first; falls back to old rollup (`mecheckin_101-1`) when wallet not activated on new chain. Supports multiple wallets via numbered `PRIVATE_KEY_1`, `PRIVATE_KEY_2`, ... or `MNEMONIC_1`, `MNEMONIC_2`, ... secrets.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Correct rollup check-in type URL is `/mechain.checkin.MsgCheckIn`** with **3 fields**: `checkInAddress` (1, wallet address), `checkInMessage` (2, message text), `checkInTimezone` (3, timezone string e.g. `"UTC"`). Confirmed by Meta Earth technical team 2026-06-13. Proto: `repos/meta-earth/proto/mechain/checkin/tx.proto`.
- **DO NOT use `/stchain.rollapp.checkin.MsgCheckIn`** (creator/slogan/recoverInterruption) — this was the wrong module identified from old dead rollup mempool txs; the official team confirmed `/mechain.checkin.MsgCheckIn` is correct.
- **DO NOT use `/metaearth.wstaking.MsgNewRecord` for check-in** — that is the "Show E" task module on the hub chain. Sending `MsgNewRecord` triggers "Show E" in the Meta Earth app, not "Daily Sign-in".
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
| `CHECK_IN_TIMEZONE` | Timezone for check-in (optional, defaults to `UTC`, e.g. `Asia/Shanghai`) |

## Dashboard login (Replit Auth)

The dashboard is protected by **Replit OIDC**. Login redirects through `/api/login` → `/api/callback`. Sessions are stored in PostgreSQL (`sessions` table). No email/password form — Replit handles authentication.

- Wallet private keys/mnemonics stay in PostgreSQL — never sent externally
- Session secret stored as `SESSION_SECRET` Replit secret

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- RPC config source: `repos/meta-earth-js-sdk/src/config/define.ts`
- MsgNewRecord source: `repos/me-hub/x/wstaking/keeper/msg_server_record.go`
