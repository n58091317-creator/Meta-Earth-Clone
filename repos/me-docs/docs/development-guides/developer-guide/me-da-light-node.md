---
sidebar_position: 2
title: ME-DA Light Node Deployment
---

# ME-DA Light Node Setup Guide

## Introduction

### What is an ME-DA Light Node?

ME-DA Light Node is a client node for ME Protocol's Data Availability layer, used for:
- RollApp submitting block data to the DA layer
- Verifying data availability proofs
- Retrieving historical data from the DA layer

### Why Deploy a Light Node?

1. **Data Submission**: RollApps need to submit batch data to the DA layer through light nodes
2. **Gas Fee Payment**: Light node account is responsible for paying gas fees for DA submissions
3. **High Availability**: Self-hosted light nodes avoid dependency on public nodes, improving reliability
4. **Access Control**: Control access permissions through auth_token

### ME Protocol Beta Testnet Information

```bash
# DA Bridge Node
BRIDGE_RPC="https://beta-da-26758.explorer-testnet.me"
BRIDGE_P2P_PORT="https://beta-da-2121.explorer-testnet.me"

# ME Hub (Settlement Layer)
HUB_RPC="https://beta-hub-26657.explorer-testnet.me"
HUB_CHAIN_ID="mechain_400-1"

# DA Network Identifier
DA_NETWORK="private"  # Beta testnet uses private network
```

## Download Official MeDa Binary

ME-DA is built on the meda architecture

```bash
# Verify installation
meda-appd version
meda version  # Light node client
```

**Expected Output:**
```
meda-appd version: v1.x.x
meda version: v0.x.x
```

## Setup Steps

### Step 1: Get Bridge Node Information

Retrieve connection information from the Beta testnet bridge node.

```bash
# Query bridge node Peer ID
BRIDGE_PEER_ID=$(meda p2p info \
  --url "https://beta-da-26758.explorer-testnet.me" \
  --token "aa" | jq -r '.result.id')

echo "Bridge Peer ID: $BRIDGE_PEER_ID"
```

**Expected Output Example:**
```
Bridge Peer ID: 12D3KooWRWnivfGpFYxG7YXSoUebASbb1zNAZuDQuV7tNjuCjyfe
```

### Step 2: Get Consensus Node Trusted Hash

Light nodes need a trusted block hash as the sync starting point.

```bash
# Get genesis block hash from DA consensus node
TRUSTED_HASH=$(curl "https://beta-da-26657.explorer-testnet.me/block?height=1" 2>/dev/null \
  | jq -r .result.block_id.hash)

if [[ ${TRUSTED_HASH} == "null" ]] ; then
  echo "Error: Unable to get Trusted Hash"
  exit 1
fi

echo "Trusted Hash: $TRUSTED_HASH"
```

### Step 3: Initialize Light Node

```bash
# Define light node data directory
LIGHT_HOME="$HOME/.meda-light"

# Initialize light node (using private network)
meda light init \
  --p2p.network private \
  --node.store "$LIGHT_HOME"
```

**Directory Structure:**
```
~/.meda-light/
├── config.toml      # Node configuration
├── data/            # Data directory
└── keys/            # Key storage
```

### Step 4: Configure Light Node

Edit configuration file `~/.meda-light/config.toml`:

```bash
CONFIG_FILE="$LIGHT_HOME/config.toml"

# 1. Set TrustedHash
sed -i.bak "s/TrustedHash = \"\"/TrustedHash = \"${TRUSTED_HASH}\"/" "$CONFIG_FILE"

# 2. Disable authentication (manually enable later)
sed -i.bak "s/SkipAuth = false/SkipAuth = true/" "$CONFIG_FILE"

# 3. Configure consensus node IP
sed -i.bak '' -e "/\[Core\]/,+3 s/IP = \"\"/IP = \"beta-da-2121.explorer-testnet.me\"/" "$CONFIG_FILE"

# 4. Configure RPC listen address (allow external access)
sed -i.bak '' -e "/\[RPC\]/,+3 s/Address = \"localhost\"/Address = \"0.0.0.0\"/" "$CONFIG_FILE"

# 5. Configure P2P listen address
sed -i.bak "s#ListenAddresses = .*#ListenAddresses = [\"/ip4/0.0.0.0/udp/2121/quic-v1/webtransport\", \"/ip4/0.0.0.0/udp/2121/quic-v1\", \"/ip4/0.0.0.0/udp/2121/webrtc-direct\", \"/ip4/0.0.0.0/tcp/2121\"]#" "$CONFIG_FILE"

# 6. Configure trusted bridge node peer
BRIDGE_MULTIADDR="/dns/beta-da-2121.explorer-testnet.me/tcp/2121/p2p/${BRIDGE_PEER_ID}"
sed -i.bak "s#TrustedPeers = \[\]#TrustedPeers = [\"${BRIDGE_MULTIADDR}\"]#" "$CONFIG_FILE"
```

**Key Configuration Parameters:**

| Parameter | Purpose | Example Value |
|-----------|---------|---------------|
| `TrustedHash` | Sync trust starting point | `D39B8A3C61DBB48035CC3BBC5CDF7B233CF281F1920982B56913AD6C79150E41` |
| `SkipAuth` | Skip authentication | `false` (production) |
| `Core.IP` | DA consensus node IP | `beta-da-2121.explorer-testnet.me` |
| `RPC.Address` | RPC listen address | `0.0.0.0` (allow remote access) |
| `TrustedPeers` | Trusted bridge node | `/dns/beta-da-2121.explorer-testnet.me/tcp/2121/p2p/12D3KooWRWnivfGpFYxG7YXSoUebASbb1zNAZuDQuV7tNjuCjyfe` |

### Step 5: Start Light Node (Test Mode)

First start without authentication to ensure node syncs properly.

```bash
# Start light node in background
nohup meda light start \
  --p2p.network private \
  --node.store "$LIGHT_HOME" \
  > ~/meda-light.log 2>&1 &

# View startup logs
tail -f ~/meda-light.log
```

**Successful Log Example:**
```
INFO  node  node/init.go:29  meda Light Node is running
INFO  das   das/daser.go:125  sampling successful
```

### Step 6: Verify Light Node is Running

```bash
# Query node info (no token needed because SkipAuth=true)
meda p2p info \
  --url "http://localhost:26658" \
  --token "aa"

# Query node sync state
meda header sync-state \
  --url "http://localhost:26658" \
  --token "aa"
```

**Expected Output:**
```json
{
  "result": {
    "id": "12D3KooW...",
    "addrs": ["/ip4/..."]
  }
}
```

## Enable Authentication and Generate auth_token

Production environments must enable authentication to prevent unauthorized access.

### Step 1: Stop Light Node

```bash
pkill -f "meda light start"
```

### Step 2: Modify Configuration to Enable Authentication

```bash
# Edit config.toml
sed -i.bak "s/SkipAuth = true/SkipAuth = false/" "$LIGHT_HOME/config.toml"
```

### Step 3: Restart Light Node

```bash
nohup meda light start \
  --p2p.network private \
  --node.store "$LIGHT_HOME" \
  > ~/meda-light.log 2>&1 &
```

### Step 4: Generate auth_token

Generate a JWT Token with **write permissions** for RollApp data submission.

```bash
# Generate write permission token
AUTH_TOKEN=$(meda light auth write \
  --p2p.network private \
  --node.store "$LIGHT_HOME")

echo "DA Auth Token: $AUTH_TOKEN"
```

**Token Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBbGxvdyI6WyJwdWJsaWMiLCJyZWFkIiwid3JpdGUiXX0.e5wQvoQeSN2WwBqnOXYjQu6gmpXaWc3hFKS9MK2LNKw
```

**Token Permission Explanation:**
- `public`: Public interface access
- `read`: Data read permission
- `write`: Data submission permission (required for RollApp)

### Step 5: Verify Token Validity

```bash
# Query node info with new token
meda p2p info \
  --url "http://localhost:26658" \
  --token "$AUTH_TOKEN"

# If token is invalid, returns:
# Error: unauthorized
```

## RollApp Using Light Node

### da_config Configuration Details

Configure `da_config` in RollApp's `dymint.toml` to connect to your light node.

```toml
### DA Configuration ###
da_layer = "me-da"
namespace_id = "0000000000000000ffff"

# da_config is a JSON-formatted configuration string
da_config = '{
  "base_url": "http://localhost:26658",
  "timeout": 50000000000,
  "gas_prices": 0.1,
  "auth_token": "YOUR_AUTH_TOKEN_HERE",
  "backoff": {
    "initial_delay": 6000000000,
    "max_delay": 6000000000,
    "growth_factor": 2
  },
  "retry_attempts": 4,
  "retry_delay": 3000000000
}'
```

**Parameter Explanation:**

| Parameter | Type | Description | Example Value |
|-----------|------|-------------|---------------|
| `base_url` | string | Light node RPC address | `http://localhost:26658` |
| `timeout` | int64 | Request timeout (nanoseconds) | `50000000000` (50 seconds) |
| `gas_prices` | float | Gas price (udmec/gas) | `0.1` |
| `auth_token` | string | JWT authentication token | `eyJhbGci...` |
| `retry_attempts` | int | Retry attempts | `4` |
| `retry_delay` | int64 | Retry interval (nanoseconds) | `3000000000` (3 seconds) |

### Configure Billing Account (address)

**Why is address needed?**

When RollApp submits data to the DA layer, gas fees need to be paid. The account specified by the DA light node will be charged `umec` tokens from the DA chain as transaction fees.

**Configuration Steps:**

#### 1. Confirm Sequencer Account Address

```bash
# Confirm sequencer account address
SEQUENCER_ADDR=$(med keys show seq_openroll \
  -a \
  --keyring-dir ~/.openroll/sequencer_keys \
  --keyring-backend test)

echo "Sequencer Address: $SEQUENCER_ADDR"
```

#### 2. Confirm Account Has Sufficient Balance

```bash
# Query balance on ME Hub
med q bank balances $SEQUENCER_ADDR \
  --node https://beta-hub-26657.explorer-testnet.me

# Recommended to maintain balance > 50 mec (50000000 umec)
```

**Top up when balance is insufficient:**
```bash
# Transfer from another account
med tx bank send YOUR_FUNDED_ADDR $SEQUENCER_ADDR 50000000umec \
  --node https://beta-hub-26657.explorer-testnet.me \
  --chain-id mechain_400-1 \
  --fees 10000umec \
  --yes
```

#### 3. Update da_config

```bash
# Replace placeholders with actual sequencer address and token
sed -i.bak \
  -e "s|YOUR_AUTH_TOKEN_HERE|$AUTH_TOKEN|g" \
  -e "s|YOUR_BRIDGE_ADDRESS|$SEQUENCER_ADDR|g" \
  ~/.openroll/config/dymint.toml
```

#### 4. Verify Configuration

```bash
# Check da_config in dymint.toml
grep -A 15 "da_config" ~/.openroll/config/dymint.toml
```

**Correct Configuration Example:**
```toml
da_config = '{"base_url":"http://localhost:26658","timeout":50000000000,"gas_prices":0.1,"auth_token":"eyJhbGci...",...}'
```

### Start RollApp and Verify DA Submission

```bash
# Start RollApp
nohup rollappd start --home ~/.openroll > ~/openroll.log 2>&1 &

# Monitor DA submission logs
tail -f ~/openroll.log | grep "Submitted batch to DA"
```

**Successful Log Example:**
```
INFO  Submitted batch to DA  {"start": 1, "end": 10, "height": 579827}
```

**Verify Billing:**
```bash
# Query sequencer balance again (should have decreased by gas fees)
med q bank balances $SEQUENCER_ADDR \
  --node https://beta-hub-26657.explorer-testnet.me
```

## Common Issues

### 1. Light Node Startup Failure

**Symptom:**
```
Error: failed to connect to core: context deadline exceeded
```

**Troubleshooting Steps:**
```bash
# 1. Check if bridge node is reachable
curl https://beta-da-26958.explorer-testnet.me/p2p/info

# 2. Verify TrustedHash is correct
grep TrustedHash ~/.meda-light/config.toml

# 3. Check TrustedPeers configuration
grep TrustedPeers ~/.meda-light/config.toml
```

### 2. DA Submission Failed - Authentication Error

**Symptom:**
```
ERROR: DA submission failed: unauthorized
```

**Solution:**
```bash
# 1. Regenerate auth_token
AUTH_TOKEN=$(meda light auth write \
  --p2p.network private \
  --node.store ~/.meda-light)

# 2. Update auth_token in dymint.toml
# Edit ~/.openroll/config/dymint.toml, replace "auth_token" field

# 3. Restart RollApp
pkill -f "rollappd start"
nohup rollappd start --home ~/.openroll > ~/openroll.log 2>&1 &
```

### 3. High Gas Fees

**Symptom:**
```
INFO  DA batch submitted  {"gas_used": 500000, "fees": "50000000udmec"}
```

**Optimization Solution:**
```toml
# Adjust batch parameters in dymint.toml

# 1. Increase batch submission interval (reduce submission frequency)
batch_submit_max_time = "120s"  # Increase from 60s to 120s

# 2. Increase batch size (submit more blocks at once)
block_batch_max_size_bytes = 3000000

# 3. Lower gas price (may affect submission speed)
# Set in da_config:
"gas_prices": 0.05  # Reduce from 0.1 to 0.05
```

### 4. Light Node Data Sync Slow

**Troubleshooting Steps:**
```bash
# 1. Check network connection
meda p2p peers \
  --url "http://localhost:26658" \
  --token "$AUTH_TOKEN"

# 2. View sync state
meda header sync-state \
  --url "http://localhost:26658" \
  --token "$AUTH_TOKEN"

# 3. Check for errors in logs
tail -100 ~/meda-light.log | grep ERROR
```

## Reference Resources

- **RollApp Deployment Guide**: [rollup.md](rollup.md)
- **Beta Testnet Info**: Contact ME Protocol operations team

## Summary

Through this guide, you have completed:
1. ✅ Compiled and installed meda-app and meda client
2. ✅ Connected to ME Protocol Beta testnet bridge node
3. ✅ Initialized and configured DA light node
4. ✅ Generated auth_token and enabled authentication
5. ✅ Configured RollApp's da_config
6. ✅ DA light node specified address as DA gas billing account
7. ✅ Verified successful DA data submission

Now your RollApp can securely and efficiently submit block data to the ME Protocol Data Availability layer through your self-hosted DA light node!
