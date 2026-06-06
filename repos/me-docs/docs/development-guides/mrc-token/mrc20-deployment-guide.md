---
sidebar_position: 2
title: MRC 20 Deployment Guide
---

# MRC 20 Token Contract Deployment and Interaction Guide

A WASM implementation of the MRC 20 token standard, similar to Ethereum's MRC 20.

[Please see example code here.](https://github.com/openmetaearth/me-docs/blob/main/docs/development-guides/mrc-token/mrc20-token-contract.md)

## Features

- ✅ Token minting, transfer, and burning
- ✅ Allowance management
- ✅ Token metadata (name, symbol, decimals)
- ✅ Balance queries
- ✅ Total supply tracking

## Prerequisites

- Rust 1.70+
- wasm32-unknown-unknown target
- Docker (optional, for optimized builds)
- jq (for JSON parsing in scripts)

## Installation

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add wasm target
rustup target add wasm32-unknown-unknown
```

## Building the Contract

```bash
# Development build
cargo build

# Build WASM (compatible with older WASM versions like v0.43.0)
./scripts/build.sh

# Optimized build with wasm-opt
./scripts/build-optimized.sh

# Docker-based optimized build (for production)
./scripts/optimize.sh
```

**Note:** If your chain uses an older version of WASM (e.g., v0.43.0), use `build.sh` or `build-optimized.sh` to disable bulk memory operations for compatibility.

## Running Tests

```bash
# Run all tests
cargo test

# Run integration tests only
cargo test --test integration
```

## Deployment & Interaction

The `deploy.sh` script provides a comprehensive interface for deploying and interacting with the contract.

### Configuration

Edit the configuration variables at the top of `scripts/deploy.sh`:

```bash
CHAIN_ID="mechain_100-1"
NODE="tcp://127.0.0.1:36657"
WALLET_NAME="user"
KEYRING_BACKEND="test"
```

### Deployment Commands

```bash
# Deploy everything (store, instantiate, and query)
./scripts/deploy.sh all

# Upload contract code only
./scripts/deploy.sh store

# Instantiate contract (uses .code_id if CODE_ID not provided)
./scripts/deploy.sh instantiate [CODE_ID]

# Query contract information
./scripts/deploy.sh query [CONTRACT_ADDRESS]
```

### Query Commands

```bash
# Query your token balance (auto-reads contract address from .contract_address)
./scripts/deploy.sh balance

# Query specific address balance
./scripts/deploy.sh balance [CONTRACT_ADDRESS] <ADDRESS>

# Query allowance (default owner: your address)
./scripts/deploy.sh allowance [CONTRACT_ADDRESS] [OWNER_ADDRESS] <SPENDER_ADDRESS>
```

### Execute Commands

#### Transfer Tokens
```bash
# Transfer tokens (auto-reads contract address)
./scripts/deploy.sh transfer <RECIPIENT_ADDRESS> <AMOUNT>

# Transfer with explicit contract address
./scripts/deploy.sh transfer <CONTRACT_ADDRESS> <RECIPIENT_ADDRESS> <AMOUNT>

# Example: Transfer 1,000,000 tokens (6 decimals)
./scripts/deploy.sh transfer me19abc... 1000000
```

#### Mint Tokens (Minter Only)
```bash
# Mint new tokens
./scripts/deploy.sh mint <RECIPIENT_ADDRESS> <AMOUNT>

# Example: Mint 5,000,000 tokens
./scripts/deploy.sh mint me19abc... 5000000
```

#### Burn Tokens
```bash
# Burn your own tokens
./scripts/deploy.sh burn <AMOUNT>

# Example: Burn 1,000,000 tokens
./scripts/deploy.sh burn 1000000
```

#### Allowance Management
```bash
# Increase allowance for a spender
./scripts/deploy.sh increase-allowance <SPENDER_ADDRESS> <AMOUNT>

# Decrease allowance for a spender
./scripts/deploy.sh decrease-allowance <SPENDER_ADDRESS> <AMOUNT>

# Transfer tokens using allowance
./scripts/deploy.sh transfer-from <OWNER_ADDRESS> <RECIPIENT_ADDRESS> <AMOUNT>

# Burn tokens using allowance
./scripts/deploy.sh burn-from <OWNER_ADDRESS> <AMOUNT>
```

### Complete Deployment Example

```bash
# 1. Build the contract
./scripts/build.sh

# 2. Deploy everything
./scripts/deploy.sh all

# This will:
# - Upload the contract code and save Code ID to .code_id
# - Instantiate the contract and save address to .contract_address
# - Save deployment info to .deployment_info.json
# - Query and display contract information

# 3. Interact with the deployed contract
./scripts/deploy.sh balance
./scripts/deploy.sh transfer me19abc... 1000000
./scripts/deploy.sh mint me19def... 5000000
```

### Deployment Info Files

After deployment, the script creates these files:
- `.code_id` - Contains the uploaded contract code ID
- `.contract_address` - Contains the instantiated contract address
- `.deployment_info.json` - Complete deployment information in JSON format

These files allow you to run commands without specifying the contract address each time.

## Contract Interaction Examples

### Query Token Information
```bash
# Get token info (name, symbol, decimals, total supply)
./scripts/deploy.sh query

# Output:
# Token Info:
# {
#   "name": "ME Test Token",
#   "symbol": "MET",
#   "decimals": 6,
#   "total_supply": "1000000000000"
# }
```

### Transfer Tokens
```bash
# Transfer 1 MET (1,000,000 with 6 decimals)
./scripts/deploy.sh transfer me19recipient... 1000000

# Check balance after transfer
./scripts/deploy.sh balance me19recipient...
```

### Allowance Workflow
```bash
# 1. Grant allowance to a spender
./scripts/deploy.sh increase-allowance me19spender... 2000000

# 2. Check allowance
./scripts/deploy.sh allowance me18owner... me19spender...

# 3. Spender transfers tokens on behalf of owner
# (Run this as the spender account)
./scripts/deploy.sh transfer-from me18owner... me19recipient... 1000000
```

## Help

```bash
# Display all available commands and usage
./scripts/deploy.sh help
```

## WASM v0.43.0 Compatibility

This contract is built with compatibility for older WASM versions (v0.43.0) which don't support bulk memory operations. The `.cargo/config.toml` file disables these features:

```toml
[target.wasm32-unknown-unknown]
rustflags = [
  '-C', 'link-arg=-s',
  '-C', 'target-feature=-bulk-memory,-sign-ext,-mutable-globals',
  '-C', 'opt-level=z',
]
```

For detailed compatibility information, see `DEPLOYMENT.md`.

## Project Structure

```
MRC 20/
├── src/
│   ├── contract.rs      # Main contract logic (instantiate, execute, query)
│   ├── msg.rs          # Message definitions
│   ├── state.rs        # State storage
│   ├── error.rs        # Error handling
│   └── lib.rs          # Library entry point
├── tests/
│   └── integration.rs  # Integration tests
├── scripts/
│   ├── build.sh        # Build script
│   ├── deploy.sh       # Unified deployment & interaction script
│   └── *.sh           # Other utility scripts
├── artifacts/          # Compiled WASM files
├── Cargo.toml         # Rust dependencies
└── README.md          # This file
```

## License

MIT License
