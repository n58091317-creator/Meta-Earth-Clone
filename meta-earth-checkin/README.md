# Meta Earth Daily Check-in Bot

Automated daily check-in bot for the Meta Earth blockchain. Signs and broadcasts a `MsgCheckin` transaction on a schedule for one or more wallets.

## Setup

### 1. Install dependencies

```bash
cd meta-earth-checkin
npm install
```

### 2. Set Replit Secrets

Go to **Tools → Secrets** and add:

| Secret | Value |
|--------|-------|
| `MNEMONIC` | Your 12 or 24 word mnemonic phrase |
| `NETWORK` | `mainnet` or `testnet` |
| `RUN_ON_START` | `true` |
| `CRON_SCHEDULE` | `0 8 * * *` (08:00 UTC daily) |

For multiple wallets use `MNEMONIC_1`, `MNEMONIC_2`, etc.

### 3. Run

```bash
# Start the scheduler (runs daily at 08:00 UTC by default)
npm run dev

# One-off check-in right now
npm run checkin-now
```

## How it works

1. Reads mnemonic(s) from environment variables
2. Derives wallet address and private key via the Meta Earth JS SDK
3. Builds and signs a `MsgCheckin` transaction using `@cosmjs/stargate`
4. Broadcasts to the Meta Earth hub RPC node
5. Logs the transaction hash and explorer link
6. Repeats on the configured cron schedule

## Repos cloned

All openmetaearth GitHub repos are available under `../repos/`:

- `meta-earth` — Core blockchain node
- `meta-earth-js-sdk` — Official JS SDK
- `me-docs` — Documentation
- `openroll` — Rollup implementation
- `me-hub` — Hub chain
- `ethermint` — EVM compatibility layer
- `cosmos-sdk` — Cosmos SDK fork
- `go-log` — Logging utilities
- `osmosis` — AMM/DEX

## Security

- Mnemonics and private keys are **never** logged or written to disk
- All secrets come from environment variables only
- Signing happens locally before broadcasting
