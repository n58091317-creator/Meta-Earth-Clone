# Meta Earth Check-in Bot

A daily check-in automation bot for the Meta Earth blockchain, plus all openmetaearth GitHub repos cloned locally for reference.

## Run & Operate

- `pnpm --filter @workspace/meta-earth-checkin run dev` — start the bot (runs immediately + schedules daily cron)
- `pnpm --filter @workspace/meta-earth-checkin run checkin-now` — one-off check-in right now
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Bot: `@cosmjs/stargate` + `@cosmjs/proto-signing`, `node-cron`

## Where things live

- `meta-earth-checkin/src/index.ts` — bot entry point / cron scheduler
- `meta-earth-checkin/src/checkin.ts` — MsgCheckin transaction logic
- `meta-earth-checkin/src/wallet.ts` — wallet derivation from mnemonic
- `meta-earth-checkin/src/logger.ts` — timestamped logger
- `meta-earth-checkin/.env.example` — env var template
- `repos/` — all 9 openmetaearth GitHub repos (shallow clones)

## Architecture decisions

- Bot uses `@cosmjs/stargate` + `@cosmjs/proto-signing` directly instead of `meta-earth-js-sdk` (that SDK is not published to npm; cosmjs is what the SDK uses internally)
- `MsgCheckin` is encoded manually as minimal protobuf (field 1 = creator string) since there are no compiled proto types for the checkin module
- `protobufjs` is overridden to `^7.4.0` in `pnpm-workspace.yaml` — version 6.x is blocked by Replit's security policy
- Network RPC endpoints and address prefix (`me`) sourced directly from the SDK source in `repos/meta-earth-js-sdk/src/config/define.ts`

## Product

Daily check-in bot that signs and broadcasts a `MsgCheckin` transaction on the Meta Earth hub chain on a configurable cron schedule. Supports multiple wallets via numbered `MNEMONIC_1`, `MNEMONIC_2`, ... secrets.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `meta-earth-js-sdk` is not published on npm — use local clone in `repos/meta-earth-js-sdk/` for reference, or depend on cosmjs directly
- `protobufjs@6.x` is blocked by Replit security policy; override to `^7.4.0` is set in `pnpm-workspace.yaml`
- The MsgCheckin type URL is `/metaearth.checkin.v1beta1.MsgCheckin` — unverified against the live chain; adjust if the chain uses a different module path

## Secrets to set in Replit

| Secret | Value |
|--------|-------|
| `MNEMONIC` | Your 12 or 24 word mnemonic phrase |
| `NETWORK` | `mainnet` or `testnet` |
| `RUN_ON_START` | `true` |
| `CRON_SCHEDULE` | `0 8 * * *` (08:00 UTC daily, optional) |

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
