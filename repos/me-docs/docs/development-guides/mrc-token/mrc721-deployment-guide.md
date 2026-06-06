---
sidebar_position: 4
title: MRC 721 Deployment Guide
---

# MRC 721 NFT Contract Deployment and Interaction Guide

A WASM implementation of the MRC 721 NFT standard, similar to Ethereum's ERC721.

[Please see example code here.](https://github.com/openmetaearth/me-docs/blob/main/docs/development-guides/mrc-token/mrc721-nft-contract.md)

## Features

- ✅ NFT minting, transfer, and burning
- ✅ Approval management (per-token and operator approvals)
- ✅ NFT metadata support
- ✅ Token URI for external metadata
- ✅ Query NFT ownership and information
- ✅ Enumerable NFTs (list all tokens, tokens by owner)

## Prerequisites

- Rust 1.70+
- wasm32-unknown-unknown target
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
```

## Running Tests

```bash
# Run all tests
cargo test
```

## Deployment & Interaction

The `deploy.sh` script provides a comprehensive interface for deploying and interacting with the NFT contract.

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

# Instantiate contract
./scripts/deploy.sh instantiate [CODE_ID]

# Query contract information
./scripts/deploy.sh query [CONTRACT_ADDRESS]
```

### Execute Commands

#### Mint NFT
```bash
# Mint NFT with token URI
./scripts/deploy.sh mint <TOKEN_ID> <OWNER_ADDRESS> <TOKEN_URI>

# Example: Mint NFT #1
./scripts/deploy.sh mint token1 me19abc... https://example.com/nft1.json

# Mint without token URI
./scripts/deploy.sh mint token2 me19abc...
```

#### Transfer NFT
```bash
# Transfer NFT to another address
./scripts/deploy.sh transfer <RECIPIENT_ADDRESS> <TOKEN_ID>

# Example: Transfer NFT #1
./scripts/deploy.sh transfer me19recipient... token1
```

#### Approve Operations
```bash
# Approve address for specific token
./scripts/deploy.sh approve <SPENDER_ADDRESS> <TOKEN_ID>

# Approve operator for all tokens
./scripts/deploy.sh approve-all <OPERATOR_ADDRESS>

# Examples
./scripts/deploy.sh approve me19spender... token1
./scripts/deploy.sh approve-all me19operator...
```

#### Burn NFT
```bash
# Burn NFT (must be owner or approved)
./scripts/deploy.sh burn <TOKEN_ID>

# Example
./scripts/deploy.sh burn token1
```

### Query Commands

#### Query NFT Owner
```bash
# Query who owns an NFT
./scripts/deploy.sh owner-of <TOKEN_ID>

# Example
./scripts/deploy.sh owner-of token1
```

#### Query NFT Information
```bash
# Query NFT metadata
./scripts/deploy.sh nft-info <TOKEN_ID>

# Example
./scripts/deploy.sh nft-info token1
```

#### Query Tokens by Owner
```bash
# Query all tokens owned by an address
./scripts/deploy.sh tokens [OWNER_ADDRESS]

# Query your own tokens
./scripts/deploy.sh tokens

# Query specific address
./scripts/deploy.sh tokens me19abc...
```

#### Query All Tokens
```bash
# Query all tokens in the collection
./scripts/deploy.sh all-tokens
```

### Complete Deployment Example

```bash
# 1. Build the contract
./scripts/build.sh

# 2. Deploy everything
./scripts/deploy.sh all

# 3. Mint some NFTs
./scripts/deploy.sh mint nft1 me19owner... https://metadata.com/nft1.json
./scripts/deploy.sh mint nft2 me19owner... https://metadata.com/nft2.json
./scripts/deploy.sh mint nft3 me19owner... https://metadata.com/nft3.json

# 4. Query NFTs owned by address
./scripts/deploy.sh tokens me19owner...

# 5. Transfer an NFT
./scripts/deploy.sh transfer me19recipient... nft1

# 6. Approve someone to transfer your NFT
./scripts/deploy.sh approve me19spender... nft2

# 7. Query NFT info
./scripts/deploy.sh nft-info nft1
./scripts/deploy.sh owner-of nft1
```

### Deployment Info Files

After deployment, the script creates these files:
- `.code_id` - Contains the uploaded contract code ID
- `.contract_address` - Contains the instantiated contract address
- `.deployment_info.json` - Complete deployment information in JSON format

These files allow you to run commands without specifying the contract address each time.

## NFT Metadata Standard

The contract supports optional metadata in the `Metadata` struct:

```json
{
  "name": "NFT Name",
  "description": "Description of the NFT",
  "image": "https://example.com/image.png",
  "external_url": "https://example.com",
  "attributes": [
    {
      "trait_type": "Background",
      "value": "Blue"
    },
    {
      "trait_type": "Rarity",
      "value": "Rare",
      "display_type": "string"
    }
  ]
}
```

## WASM v0.43.0 Compatibility

This contract is built with compatibility for older WASM versions (v0.43.0). The `.cargo/config.toml` file disables bulk memory operations:

```toml
[target.wasm32-unknown-unknown]
rustflags = [
  '-C', 'link-arg=-s',
  '-C', 'target-feature=-bulk-memory,-sign-ext,-mutable-globals',
  '-C', 'opt-level=z',
]
```

## Project Structure

```
MRC 721/
├── src/
│   ├── contract.rs      # Main contract logic
│   ├── msg.rs          # Message definitions
│   ├── state.rs        # State storage
│   ├── error.rs        # Error handling
│   └── lib.rs          # Library entry point
├── scripts/
│   ├── build.sh        # Build script
│   └── deploy.sh       # Deployment & interaction script
├── artifacts/          # Compiled WASM files
├── Cargo.toml         # Rust dependencies
└── README.md          # This file
```

## Differences from MRC 20

| Feature | MRC 20 (Fungible Token) | MRC 721 (NFT) |
|---------|----------------------|-------------|
| Token Type | Fungible | Non-Fungible |
| Divisibility | Divisible | Indivisible |
| Token ID | N/A | Required (unique) |
| Metadata | Simple (name, symbol) | Rich (URI, attributes) |
| Balance | Amount (uint) | Count of tokens |
| Approvals | Per-spender allowance | Per-token + operator |

## Help

```bash
# Display all available commands and usage
./scripts/deploy.sh help
```

## License

MIT License
