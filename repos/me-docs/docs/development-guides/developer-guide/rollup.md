---
sidebar_position: 1
title: Rollup
---

# RollApp Development Guide

## Introduction

### What is a RollApp?

RollApp (Rollup Application) is an application-specific modular blockchain built on Meta Earth. Unlike traditional monolithic chains, RollApps outsource consensus overhead to ME Hub, significantly improving transaction throughput, reducing latency, and lowering computational costs.

### Core Features of RollApp

- **High-Performance Execution**: Achieve high throughput and low-latency transaction processing through Rollup technology
- **Modular Architecture**: Decouple execution layer, settlement layer, data availability layer, and consensus layer
- **Sovereignty**: Independent token economics, governance mechanisms, and business logic
- **Rapid Deployment**: Quickly build and deploy using Meta Earth's development toolkit
- **Cross-Chain Interoperability**: Achieve interoperability with other blockchains through MBC protocol
- **Cost Efficiency**: Significantly lower operating costs compared to traditional blockchains

### RollApp Architecture Components

RollApp consists of two core components:

1. **Server-Side**: Implements custom business logic with pre-packaged modules
2. **Client-Side**: Responsible for block production, node message propagation, and inter-layer communication

### Development Integration Tools

#### Frontend Development Framework

**What is it?** JavaScript code for frontend applications to connect to RollApp.

**Purpose:**
- Connect to RollApp nodes
- Create wallets for transaction signing
- Deploy and call smart contracts

```javascript
// Connect to RollApp using ethers.js
import { ethers } from 'ethers';

// Create JSON-RPC provider, connect to RollApp node
const provider = new ethers.providers.JsonRpcProvider('http://your-rollapp:8545');

// Create wallet instance with private key and connect to provider
const wallet = new ethers.Wallet(privateKey, provider);

// Deploy smart contract
const contractFactory = new ethers.ContractFactory(abi, bytecode, wallet);  // Create contract factory with ABI, bytecode, and wallet
const contract = await contractFactory.deploy();                             // Deploy contract to chain
```

#### Backend Service Integration

**What is it?** Go language code for backend services to connect to RollApp.

**Purpose:**
- Initialize client connection
- Configure codec and transaction parameters
- Interact with Cosmos SDK

```go
package main

import (
    "github.com/cosmos/cosmos-sdk/client"
    "github.com/cosmos/cosmos-sdk/client/flags"
)

func main() {
    // Initialize client
    clientCtx := client.Context{}.
        WithCodec(codec.NewProtoCodec(interfaceRegistry)).
        WithInterfaceRegistry(interfaceRegistry).
        WithTxConfig(txConfig).
        WithLegacyAmino(legacyAmino).
        WithInput(os.Stdin).
        WithAccountRetriever(types.AccountRetriever{}).
        WithBroadcastMode(flags.BroadcastBlock).
        WithHomeDir(homeDir)
}
```

## Cost Structure

### Deployment Costs

#### Initial Staking Requirements
- **Sequencer Staking**: Requires staking 10,000 MEC tokens as security deposit
- **Registration Fee**: RollApp registration fee approximately 100 MEC
- **Network Activation Fee**: First-time network activation requires 50 MEC

#### Operating Costs

##### State Update Fees
- **ME Hub Settlement**: Each state root update costs approximately 0.001 MEC
- **Transaction Processing**: Each transaction processing fee approximately 0.0001 MEC
- **Block Submission**: Each block submission fee approximately 0.01 MEC

##### Data Availability Fees
- **DA Data Publishing**: Approximately 0.0001 MEC per KB of data
- **Data Storage**: Long-term storage fees calculated by time
- **Data Retrieval**: Querying historical data may incur additional fees

##### Network Maintenance Costs
- **Node Operations**: Sequencer node operating costs (server, bandwidth, etc.)
- **Monitoring Services**: System monitoring and alerting service fees
- **Backup Storage**: Data backup and recovery service fees

### Cost Optimization Strategy

### Why Optimize?

Main costs for RollApp come from:
- **State Updates**: Each state submission to ME Hub requires fees
- **Data Storage**: Publishing data to DA layer requires fees
- **Block Submission**: Each block submission has costs

### Core Optimization Approach

1. **Reduce Submission Frequency**: Batch process multiple operations, submit at once
2. **Compress Data Size**: Use compression techniques to reduce stored data volume
3. **Smart Scheduling**: Submit during off-peak periods to reduce gas fees

### Specific Optimization Methods

#### Batch Processing Optimization

**What is it?** Combine multiple transfer operations into a single transaction.

**Why do this?**
- Originally 100 transfers require 100 submissions (high cost)
- After batch processing, only 1 submission needed (99% cost reduction)
- Suitable for payroll processing, airdrops, and similar scenarios

```solidity
// Batch process transactions to reduce state update frequency
contract BatchProcessor {
    // Batch transfer function, processes multiple transfer operations at once
    function batchTransfer(
        address[] calldata recipients,  // Recipient address array (using calldata to save gas)
        uint256[] calldata amounts      // Transfer amount array
    ) external {
        require(recipients.length == amounts.length, "Array length mismatch");  // Ensure array lengths match
        
        // Loop through each transfer operation
        for (uint i = 0; i < recipients.length; i++) {
            _transfer(msg.sender, recipients[i], amounts[i]);  // Execute individual transfer
        }
    }
}
```

#### State Compression Technique

**What is it?** Use Merkle trees to compress large amounts of state data into a single root hash.

**Why do this?**
- Originally need to store all account data (large storage space)
- After compression, only store one root hash (small storage space)
- When verifying data, only need to compare root hash

**Savings effect:** 1000 account data → 1 32-byte hash value

```go
// Use Merkle tree to compress state data
type StateTree struct {
    root   *MerkleNode           // Merkle tree root node
    leaves map[string][]byte     // Leaf node mapping table, stores actual state data
}

// Update a key-value pair in the state tree
func (st *StateTree) UpdateState(key string, value []byte) {
    st.leaves[key] = value       // Update leaf node value
    st.root = st.recalculateRoot()  // Recalculate Merkle root for state integrity verification
}
```

## Complete Deployment Demo: OpenRoll Project on Beta Testnet

OpenRoll is ME Protocol's official open-source RollApp example project, demonstrating how to deploy a complete RollApp from scratch.

**Project URL**: https://github.com/openmetaearth/openroll
**Testnet Environment**: ME Protocol Beta Testnet (mechain_400-1)

### Prerequisites

**Environment Requirements:**
- Go 1.21 or higher
- Access to ME Protocol Beta testnet
- Deployer whitelist account (for creating RollApp)

**Beta Testnet Information:**
```bash
Hub RPC:    https://beta-hub-26657.explorer-testnet.me
Hub gRPC:   https://beta-hub-9090.explorer-testnet.me:9091
Hub REST:   https://beta-hub-1317.explorer-testnet.me
DA Node:    https://beta-da-26758.explorer-testnet.me
Chain ID:   mechain_400-1
```

### Step 1: Clone and Compile OpenRoll

```bash
# Clone OpenRoll project
git clone https://github.com/openmetaearth/openroll.git
cd openroll

# Compile and install rollappd binary
make install

# Verify installation
rollappd version
```

### Step 2: Initialize RollApp Node

```bash
# Initialize chain (set chain-id and moniker)
rollappd init openroll-node --chain-id openroll_1-1 --home ~/.openroll

# Configure keyring and chain-id
rollappd config keyring-backend test --home ~/.openroll
rollappd config chain-id openroll_1-1 --home ~/.openroll
```

**Configure minimum gas price:**
```bash
# Edit ~/.openroll/config/app.toml
sed -i.bak 's/minimum-gas-prices = ""/minimum-gas-prices = "0urax"/' ~/.openroll/config/app.toml
```

**Modify genesis file token denomination:**
```python
# Use Python script to modify genesis.json
python3 << 'EOF'
import json
with open('~/.openroll/config/genesis.json', 'r') as f:
    data = json.load(f)
data['app_state']['staking']['params']['bond_denom'] = 'urax'
data['app_state']['gov']['deposit_params']['min_deposit'][0]['denom'] = 'urax'
with open('~/.openroll/config/genesis.json', 'w') as f:
    json.dump(data, f, indent=2)
print("Genesis file updated: bond_denom=urax")
EOF
```

### Step 3: Create Keys and Genesis Accounts

```bash
# Create rollapp local key
rollappd keys add roluser --keyring-backend test --home ~/.openroll
# ⚠️ Important: Record the mnemonic!

# Allocate genesis tokens (1 trillion urax)
rollappd add-genesis-account roluser 1000000000000urax --keyring-backend test --home ~/.openroll

# Generate sequencer gentx (bind dymint public key)
SEQ_PUB_KEY=$(rollappd dymint show-sequencer --home ~/.openroll)
rollappd gentx_seq --pubkey "$SEQ_PUB_KEY" --from roluser --home ~/.openroll

# Generate validator gentx
rollappd gentx roluser 500000000000urax \
  --chain-id openroll_1-1 \
  --keyring-backend test \
  --home ~/.openroll

# Collect gentxs and validate
rollappd collect-gentxs --home ~/.openroll
rollappd validate-genesis --home ~/.openroll
```

### Step 4: Configure Dymint (Settlement and DA Layers)

Edit `~/.openroll/config/dymint.toml`:

```toml
# Block production configuration
block_time = "200ms"
max_idle_time = "5s"
max_proof_time = "5s"
batch_submit_max_time = "60s"
block_batch_max_size_bytes = 1874272

### DA Configuration ###
da_layer = "me-da"
namespace_id = "0000000000000000ffff"
# Include bridge account configuration, use your sequencer account to pay DA gas
da_config = '{"base_url":"https://beta-da-26958.explorer-testnet.me","timeout":50000000000,"gas_prices":0.1,"auth_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBbGxvdyI6WyJwdWJsaWMiLCJyZWFkIiwid3JpdGUiXX0.1WY_3eyaVPp0yHPjsP2SlErjkZ1e4uzyGtwevI2q7Zg","backoff":{"initial_delay":6000000000,"max_delay":6000000000,"growth_factor":2},"retry_attempts":4,"retry_delay":3000000000}'

### Settlement Configuration ###
settlement_layer = "me-hub"
rollapp_id = "openroll_1-1"
settlement_node_address = "https://beta-da-26657.explorer-testnet.me"
settlement_gas_prices = "0.02umec"
retry_attempts = "20"

# Sequencer key configuration
keyring_backend = "test"
keyring_home_dir = "/path/to/.openroll/sequencer_keys"
dym_account_name = "seq_openroll"
```

**Configure client.toml (Hub sync key):**
```bash
# Append to ~/.openroll/config/client.toml
echo >> ~/.openroll/config/client.toml
echo "sync-hub-key-name = \"roluser\"" >> ~/.openroll/config/client.toml
echo "sync-hub-key-address = \"$(rollappd keys show roluser -a --keyring-backend test --home ~/.openroll)\"" >> ~/.openroll/config/client.toml
```

### Step 5: Register RollApp on ME Hub

**Prerequisite**: Must have deployer whitelist account private key.

```bash
# Create hub key directory
mkdir -p ~/.openroll/hub_keys

# Import deployer account (assuming you have private key armor file)
med keys import hub_deployer /path/to/deployer.armor \
  --keyring-dir ~/.openroll/hub_keys \
  --keyring-backend test

# Verify import (address should be in whitelist)
med keys list --keyring-dir ~/.openroll/hub_keys --keyring-backend test

# Register RollApp on ME Hub
med tx rollapp create-rollapp openroll_1-1 5 '{"Addresses":[]}' \
  --from hub_deployer \
  --keyring-dir ~/.openroll/hub_keys \
  --keyring-backend test \
  --node https://beta-hub-26657.explorer-testnet.me \
  --chain-id mechain_400-1 \
  --fees 10000umec \
  --gas auto \
  --broadcast-mode sync \
  --yes

# Verify registration success
med q rollapp show openroll_1-1 --node https://beta-hub-26657.explorer-testnet.me
```

### Step 6: Create Sequencer and Fund

```bash
# Create sequencer key directory
mkdir -p ~/.openroll/sequencer_keys/keyring-test

# Generate sequencer key
med keys add seq_openroll \
  --keyring-dir ~/.openroll/sequencer_keys \
  --keyring-backend test
# ⚠️ Important: Record mnemonic and address!

# Transfer from hub_deployer to sequencer (50 mec)
SEQUENCER_ADDR=$(med keys show seq_openroll -a --keyring-dir ~/.openroll/sequencer_keys --keyring-backend test)
med tx bank send hub_deployer $SEQUENCER_ADDR 50000000umec \
  --keyring-dir ~/.openroll/hub_keys \
  --keyring-backend test \
  --node https://beta-hub-26657.explorer-testnet.me \
  --chain-id mechain_400-1 \
  --fees 10000umec \
  --gas auto \
  --yes

# Verify transfer
med q bank balances $SEQUENCER_ADDR --node https://beta-hub-26657.explorer-testnet.me
```

### Step 7: Register Sequencer on ME Hub

```bash
# Get dymint sequencer public key
SEQ_PUB_KEY=$(rollappd dymint show-sequencer --home ~/.openroll)
echo "Sequencer PubKey: $SEQ_PUB_KEY"

# Register sequencer (stake 0.01 mec)
med tx sequencer create-sequencer \
  "$SEQ_PUB_KEY" \
  openroll_1-1 \
  '{"Moniker":"openroll-sequencer","Identity":"","Website":"","SecurityContact":"","Details":""}' \
  10000umec \
  --from seq_openroll \
  --keyring-dir ~/.openroll/sequencer_keys \
  --keyring-backend test \
  --node https://beta-hub-26657.explorer-testnet.me \
  --chain-id mechain_400-1 \
  --fees 10000umec \
  --gas auto \
  --yes

# Verify sequencer status (should be OPERATING_STATUS_BONDED)
med q sequencer show-sequencer $SEQUENCER_ADDR --node https://beta-hub-26657.explorer-testnet.me

### Step 8: Update Dymint Configuration (Fill in Actual Values)

```bash
# Update bridge_address in da_config
SEQUENCER_ADDR=$(med keys show seq_openroll -a --keyring-dir ~/.openroll/sequencer_keys --keyring-backend test)

# Edit ~/.openroll/config/dymint.toml, replace the following placeholders:
# - YOUR_DA_TOKEN: auth token obtained from DA light node
# - YOUR_SEQUENCER_ADDRESS: replace with $SEQUENCER_ADDR
# - /path/to/.openroll: replace with actual absolute path
```

**Get DA auth token:**

**Option 1: Use Official Free Token (Recommended for Testing)**

For testing purposes, you can use the official free auth_token:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJBbGxvdyI6WyJwdWJsaWMiLCJyZWFkIiwid3JpdGUiXX0.1WY_3eyaVPp0yHPjsP2SlErjkZ1e4uzyGtwevI2q7Zg
```

This token has public, read, and write permissions and can be used directly in your `da_config`.

**Option 2: Deploy Your Own DA Light Node**

Refer to **[ME-DA Light Node Setup Guide](me-da-light-node.md)** to complete:
1. Deploy DA light node and connect to Beta testnet bridge node
2. Generate auth_token with write permissions
3. Configure address as DA gas billing account

**Quick token retrieval (if you have a light node):**
```bash
# Generate write permission token
meda light auth write \
  --p2p.network private \
  --node.store ~/.meda-light
```

Or contact DA operations team for testnet token.

### Step 9: Start RollApp Node

```bash
# Start rollapp in background
nohup rollappd start --home ~/.openroll > ~/openroll.log 2>&1 &

# View startup logs
tail -f ~/openroll.log

# Successful log examples:
# INFO  rollApp block/produce.go:180  Block created.  {"height": 4}
# INFO  Submitted batch to DA  {"start": 1, "end": 10}
# INFO  Submitted batch to SL  {"Height": 579827}
```

### Step 10: Verify Deployment Success

```bash
# 1. Query local node status
rollappd status --home ~/.openroll | grep latest_block_height

# 2. Query RollApp latest height on ME Hub
med q rollapp latest-height openroll_1-1 --node https://beta-hub-26657.explorer-testnet.me

# 3. View state update records
med q rollapp state openroll_1-1 --node https://beta-hub-26657.explorer-testnet.me

# 4. Verify sequencer status
med q sequencer show-sequencer $SEQUENCER_ADDR --node https://beta-hub-26657.explorer-testnet.me
```

**Success Indicators:**
- ✅ Local node continuously producing blocks (height increasing)
- ✅ ME Hub shows `latestHeight` > 0
- ✅ Sequencer status is `OPERATING_STATUS_BONDED`
- ✅ Logs show "Submitted batch to DA" and "Submitted batch to SL"

## Troubleshooting

### Deployment Failure Diagnosis

**Issue 1: DA Submission Failed - Account Not Found**
```bash
# Error log:
ERROR: account me1xxx... not found

# Cause: address not configured in da_config or account has no balance
# Solution:
# 1. Add address in da_config (use sequencer account)
# 2. Ensure account has sufficient balance on ME Hub (at least 10 mec)
med q bank balances YOUR_SEQUENCER_ADDR --node https://beta-hub-26657.explorer-testnet.me
```

**Issue 2: Settlement Submission Failed**
```bash
# Error log:
ERROR: failed to send tx: insufficient fee

# Cause: Insufficient fees
# Solution: Check and increase gas fee configuration
# Set in dymint.toml:
settlement_gas_prices = "0.02umec"
# Or
settlement_gas_fees = "10000umec"
```

**Issue 3: Sequencer Registration Failed**
```bash
# Error log:
fee must greater than or equal 10000umec

# Cause: Beta testnet minimum fee is 10000umec
# Solution: Use correct fee
med tx sequencer create-sequencer ... --fees 10000umec
```

**Issue 4: Chain ID Mismatch**
```bash
# Error log:
signature verification failed; chain-id (mechain_100-1): unauthorized

# Cause: Used incorrect chain-id
# Solution: Beta testnet correct chain-id is mechain_400-1
--chain-id mechain_400-1
```

### View Detailed Logs

```bash
# Monitor error logs in real-time
tail -f ~/openroll.log | grep ERROR

# View DA submission logs
tail -f ~/openroll.log | grep "Submit"

# View block production logs
tail -f ~/openroll.log | grep "Block created"

# Export complete logs for analysis
tail -1000 ~/openroll.log > debug.log
```

### Reset Configuration

```bash
# Stop node
pkill -f "rollappd start"

# Backup data
cp -r ~/.openroll ~/.openroll.backup

# Clean data and reinitialize (keep keys)
rm -rf ~/.openroll/data ~/.openroll/config/genesis.json
rollappd init openroll-node --chain-id openroll_1-1 --home ~/.openroll --recover
```

### Performance Tuning

**Adjust block parameters:**
```toml
# ~/.openroll/config/dymint.toml

# Reduce block time to increase throughput (requires better hardware)
block_time = "100ms"

# Increase batch submission time to reduce gas fees
batch_submit_max_time = "120s"

# Increase batch size (ensure DA layer supports)
block_batch_max_size_bytes = 3000000
```

**Monitor system resources:**
```bash
# View node process resource usage
ps aux | grep rollappd

# Monitor disk usage
du -sh ~/.openroll/data

# View network connections
netstat -an | grep 26657
```

## Best Practices

### Security Management

**Key Management:**
```bash
# Export account private key (store securely)
rollappd keys export seq_openroll --home ~/.openroll --keyring-backend test

# Use file as keyring-backend (requires password)
rollappd keys add seq_openroll --keyring-backend file

# Production environments recommend hardware wallets or KMS
# Reference: https://docs.cosmos.network/main/run-node/keyring
```

**JWT Token Management:**
```bash
# Check DA Token expiration (decode JWT)
echo "YOUR_TOKEN" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .exp

# Regularly update Token (recommend 30-day rotation)
# 1. Get new Token from DA operations
# 2. Update auth_token in dymint.toml
# 3. Restart node
```

**Account Balance Monitoring:**
```bash
# Monitor Sequencer balance (recommend maintaining 50+ mec)
med q bank balances YOUR_SEQUENCER_ADDR \
  --node https://beta-hub-26657.explorer-testnet.me

# Set auto top-up script
#!/bin/bash
BALANCE=$(med q bank balances YOUR_ADDR --node https://beta-hub-26657.explorer-testnet.me --output json | jq -r '.balances[] | select(.denom=="umec") | .amount')
if [ "$BALANCE" -lt "10000000" ]; then
  echo "Insufficient balance, need top-up"
  # Send notification or auto top-up
fi
```

### Production Environment Configuration

**Systemd Service Configuration:**
```ini
# /etc/systemd/system/openroll.service
[Unit]
Description=OpenRoll RollApp Node
After=network-online.target

[Service]
Type=simple
User=rollapp
WorkingDirectory=/home/rollapp
ExecStart=/home/rollapp/go/bin/rollappd start --home /home/rollapp/.openroll
Restart=on-failure
RestartSec=3
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
```

**Enable service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable openroll
sudo systemctl start openroll
sudo systemctl status openroll
```

**Log Management:**
```bash
# Configure journald log limits
# /etc/systemd/journald.conf
SystemMaxUse=500M
SystemKeepFree=1G

# Restart journald
sudo systemctl restart systemd-journald

# View service logs
sudo journalctl -u openroll -f
```

### Monitoring and Alerting

**Key Metrics Monitoring:**
```bash
# 1. Rollapp block height growth
rollappd status --node tcp://localhost:26657 | jq -r .SyncInfo.latest_block_height

# 2. latestHeight on ME Hub (should continuously grow)
med q rollapp show-rollapp openroll_1-1 \
  --node https://beta-hub-26657.explorer-testnet.me | jq -r .rollapp.latestHeight

# 3. Sequencer status (should maintain OPERATING_STATUS_BONDED)
med q sequencer show-sequencer YOUR_SEQUENCER_ADDR \
  --node https://beta-hub-26657.explorer-testnet.me | jq -r .sequencer.status

# 4. DA submission interval (should not exceed 2x batch_submit_max_time)
tail -f ~/openroll.log | grep "Submitted batch"
```

**Alert Script Example:**
```bash
#!/bin/bash
# check_rollapp.sh

# Check process running status
if ! pgrep -x "rollappd" > /dev/null; then
  echo "CRITICAL: rollappd process not running"
  exit 2
fi

# Check for new blocks in last 5 minutes
CURRENT_HEIGHT=$(rollappd status --node tcp://localhost:26657 2>/dev/null | jq -r .SyncInfo.latest_block_height)
sleep 300
NEW_HEIGHT=$(rollappd status --node tcp://localhost:26657 2>/dev/null | jq -r .SyncInfo.latest_block_height)

if [ "$CURRENT_HEIGHT" == "$NEW_HEIGHT" ]; then
  echo "WARNING: No new blocks in 5 minutes"
  exit 1
fi

echo "OK: Rollapp running normally, current height $NEW_HEIGHT"
exit 0
```

### Upgrade Strategy

**Smooth Upgrade Process:**
```bash
# 1. Backup existing configuration and data
cp -r ~/.openroll ~/.openroll.backup.$(date +%Y%m%d)

# 2. Stop node
pkill -f "rollappd start"

# 3. Update binary
cd ~/GolandProjects/openroll
git pull origin main
make install

# 4. Verify version
rollappd version

# 5. Restart node
nohup rollappd start --home ~/.openroll > ~/openroll.log 2>&1 &

# 6. Monitor startup logs
tail -f ~/openroll.log
```

**Rollback Plan:**
```bash
# If upgrade has issues, quick rollback
pkill -f "rollappd start"

# Restore old version binary
cp ~/bin/rollappd.backup ~/go/bin/rollappd

# Restore configuration (if changed)
cp -r ~/.openroll.backup/* ~/.openroll/

# Restart service
nohup rollappd start --home ~/.openroll > ~/openroll.log 2>&1 &
```

### Cost Optimization

**Reduce Gas Fees:**
```toml
# 1. Increase batch submission interval (reduce transaction frequency)
batch_submit_max_time = "120s"  # Increase from 60s to 120s

# 2. Increase batch size (submit more blocks at once)
block_batch_max_size_bytes = 3000000

# 3. Use minimum gas price
settlement_gas_prices = "0.02umec"
```

**Resource Usage Optimization:**
```bash
# Periodically clean old data (use with caution)
# 1. Backup state
rollappd export > state_backup.json

# 2. Prune old blocks (keep recent 10000)
rollappd prune 10000

# 3. Compact database
rollappd compact-db
```

### Development to Production Checklist

1. **Development Phase**
   - ✅ Thoroughly test functionality in local environment
   - ✅ Verify smart contract security (if applicable)
   - ✅ Perform unit tests and integration tests

2. **Testnet Deployment** (Beta Testnet)
   - ✅ Complete rollapp and sequencer registration
   - ✅ Verify DA submission and state updates are normal
   - ✅ Conduct stress testing (high TPS scenarios)
   - ✅ Test exception recovery (node restart, network interruption)

3. **Mainnet Preparation**
   - ✅ Ensure sufficient mec tokens for staking and fees (recommend 100+ mec)
   - ✅ Configure production-grade infrastructure (Systemd, monitoring, backup)
   - ✅ Establish 24/7 operations team or automated alerting
   - ✅ Prepare emergency response plan (key loss, node failure)

4. **Mainnet Deployment**
   - ✅ Deploy using mainnet endpoints and chain-id
   - ✅ Gradually increase traffic (canary deployment)
   - ✅ Continuously monitor key metrics

5. **Long-term Operations**
   - ✅ Regularly update software versions
   - ✅ Participate in community governance voting
   - ✅ Collect user feedback and optimize performance
   - ✅ Build community and developer ecosystem

Through this complete process demonstration and best practices, developers can successfully create and deploy their own RollApp, enjoying the high performance and low cost advantages of modular blockchains.
