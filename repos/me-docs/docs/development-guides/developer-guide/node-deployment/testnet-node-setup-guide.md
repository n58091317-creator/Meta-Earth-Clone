---
sidebar_position: 1
title: Testnet Node Setup Guide
---

# Meta Earth Testnet Node Deployment Guide

This guide will help you deploy and run different types of nodes on the Meta Earth public testnet, including light nodes, full nodes, and consensus nodes (validators).

---

## Overview

### Testnet Introduction

The Meta Earth testnet is a public blockchain testing environment used for:

- 🧪 Testing new features and upgrades
- 👨‍💻 Developer integration testing
- 🎓 Learning and experimentation
- 🔍 Performance and stress testing

**Testnet Features:**
- Free test tokens (obtained through faucet)
- Same technical architecture as mainnet
- May reset periodically
- No real asset value

### Node Type Comparison

| Node Type | Storage Requirements | Participates in Consensus | Earns Rewards | Applicable Scenarios |
|-----------|---------------------|---------------------------|---------------|---------------------|
| **Light Node** | Minimal (< 1GB) | ❌ | ❌ | Wallets, browsers, quick queries |
| **Full Node** | Complete (500GB+) | ❌ | ❌ | API services, data analysis, backup |
| **Consensus Node** | Complete (500GB+) | ✅ | ✅ | Network validation, earning rewards |

---

## Testnet Information

### Network Parameters

| Parameter | Value |
|-----------|-------|
| **Chain ID** | `mechain_400-1` |
| **Token Symbol** | MEC |
| **Minimum Unit** | umec (1 MEC = 10^6 umec) |
| **Block Time** | ~3s |
| **RPC Endpoint** | https://beta-hub-26657.explorer-testnet.me |
| **REST API** | https://beta-hub-1317.explorer-testnet.me |
| **Explorer** | https://www.explorer-testnet.me |
| **Faucet** | https://www.mec.me/en-US/faucet |




### Seed Nodes

```
seed-1@testnet-seed1.mechain.io:26656
seed-2@testnet-seed2.mechain.io:26656
seed-3@testnet-seed3.mechain.io:26656
```

---

## Environment Requirements

### Light Node

| Component | Requirement |
|-----------|-------------|
| CPU | 1 core 1.5GHz |
| Memory | 2GB RAM |
| Disk | 10GB |
| Network | 1MB/s |

### Full Node

| Component | Requirement |
|-----------|-------------|
| CPU | 4 cores 2.5GHz |
| Memory | 8GB RAM |
| Disk | 500GB SSD (expandable) |
| Network | 10MB/s |

### Consensus Node (Validator)

| Component | Requirement |
|-----------|-------------|
| CPU | 8 cores 3.0GHz |
| Memory | 16GB RAM |
| Disk | 1TB NVMe SSD |
| Network | 100MB/s |
| Backup Server | Recommended with same configuration |

> **Important Notice:**
> 
> - Validator nodes must maintain 99%+ uptime
> - Recommend using dedicated servers, avoid sharing with other applications
> - Need to configure monitoring and alert systems

---

## Preparation

### Step 1: Install Basic Software

```bash
# Update system (ensure system packages are up to date)
sudo apt-get update && sudo apt-get upgrade -y

# Install necessary tools (curl, wget for downloads, jq for JSON parsing, git for version control)
sudo apt-get install -y curl wget jq git build-essential

# Install Go (required for building node program from source)
wget https://go.dev/dl/go1.23.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc

# Verify Go installation
go version
```

### Step 2: Install NTP Service

```bash
# Install NTP service (ensure node time synchronization, avoid consensus failure)
sudo apt-get install -y ntp
# Set NTP service to start on boot
sudo systemctl enable ntp
# Start NTP service
sudo systemctl start ntp

# Verify time synchronization (check time server connection status)
ntpq -p
```

### Step 3: Build Node Program from Source

```bash
# Create directory
export MECHAIN_HOME="${HOME}/.mechain"
mkdir -p ${MECHAIN_HOME}

# Clone the me-hub repository
cd ~
git clone https://github.com/openmetaearth/me-hub.git
cd me-hub

# Build and install
make install

# Verify installation
med version
```

---

## Deploy Light Node

Light nodes sync and verify blocks quickly by trusting specific full nodes, without downloading complete blockchain data.

### Initialize Node

```bash
# Initialize node (create node config files and keys)
med init my-light-node \
  --chain-id mechain_400-1 \
  --home ${MECHAIN_HOME}
```

### Configure Light Client

Edit `${MECHAIN_HOME}/config/config.toml`:

```toml
# Enable light client mode
[statesync]
enable = true                              # Enable state sync functionality

# Configure RPC servers
rpc_servers = "https://beta-hub-1317.explorer-testnet.me,https://rpc-testnet-backup.mechain.io:443"  # RPC server list, comma-separated

# Trust height and hash (obtain from explorer)
trust_height = 1000000                     # Trust block height (recommend latest height minus several thousand blocks)
trust_hash = "3B8F9A7E2C1D..."            # Block hash corresponding to trust height

# Trust period
trust_period = "168h0m0s"                 # Trust period set to 7 days (168 hours)
```

> **Obtaining Trust Height and Hash:**
> 
> Visit https://explorer-testnet.mechain.io, view latest block height minus several thousand blocks as trust height, and obtain that block's hash.

### Start Light Node

```bash
# Foreground run (use for testing, can directly see output logs)
med start --home ${MECHAIN_HOME}

# Background run (use in production, log output to file)
nohup med start --home ${MECHAIN_HOME} > ${MECHAIN_HOME}/node.log 2>&1 &

# Using systemd (recommended)
sudo tee /etc/systemd/system/mechain-light.service > /dev/null <<EOF
[Unit]
Description=Meta Earth Light Node
After=network-online.target

[Service]
User=$USER
ExecStart=/usr/local/bin/med start --home ${MECHAIN_HOME}
Restart=on-failure
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mechain-light
sudo systemctl start mechain-light
```

### Verify Light Node

```bash
# View node status (shows node ID, latest block height, sync status, etc.)
med status --home ${MECHAIN_HOME}

# View logs (real-time view of node operation logs)
journalctl -u mechain-light -f

# Test RPC (check if RPC service responds normally)
curl -s http://localhost:26657/status | jq .
```

---

## Deploy Full Node

Full nodes download and verify all blocks, providing complete historical data query capabilities.

### Initialize Node

```bash
# Initialize node
med init my-full-node \
  --chain-id mechain_400-1 \
  --home ${MECHAIN_HOME}
```


### Configure Node

Edit `${MECHAIN_HOME}/config/config.toml`:

```toml
# P2P Configuration
[p2p]
# Seed nodes
seeds = "seed-1@testnet-seed1.mechain.io:26656,seed-2@testnet-seed2.mechain.io:26656"  # Seed node list for node discovery

# Max inbound/outbound connections
max_num_inbound_peers = 40                 # Max inbound connections (other nodes connecting to this node)
max_num_outbound_peers = 10                # Max outbound connections (this node connecting to other nodes)

# RPC Configuration
[rpc]
laddr = "tcp://0.0.0.0:26657"             # RPC listen address, 0.0.0.0 means listen on all network interfaces
cors_allowed_origins = ["*"]              # Allow CORS requests from all origins

# Enable indexing (if need to query historical transactions)
[tx_index]
indexer = "kv"                            # Use KV storage to index transaction data
```

Edit `${MECHAIN_HOME}/config/app.toml`:

```toml
# API Configuration
[api]
enable = true                              # Enable REST API service
swagger = true                             # Enable Swagger documentation interface
address = "tcp://0.0.0.0:1317"            # REST API listen address and port

# gRPC Configuration
[grpc]
enable = true                              # Enable gRPC service
address = "0.0.0.0:9090"                  # gRPC listen address and port

# Minimum gas price
minimum-gas-prices = "0.001ulat"          # Minimum gas price node accepts, transactions below this will be rejected

# Data retention policy (full node retains all data)
pruning = "nothing"                       # No data pruning, retain all historical data
```

### Quick Sync (Recommended)

#### Method 1: State Sync (Fastest)

Edit `${MECHAIN_HOME}/config/config.toml`:

```toml
[statesync]
enable = true
rpc_servers = "https://beta-hub-1317.explorer-testnet.me,https://rpc-testnet-backup.mechain.io:443"
trust_height = 2000000
trust_hash = "Obtain latest trust hash"
trust_period = "168h0m0s"
```

#### Method 2: Sync from Genesis (Slowest but Safest)

Start node directly, wait for sync completion (may take several days).

### Start Full Node

```bash
# Create systemd service
sudo tee /etc/systemd/system/mechain-full.service > /dev/null <<EOF
[Unit]
Description=Meta Earth Full Node
After=network-online.target

[Service]
User=$USER
ExecStart=/usr/local/bin/med start --home ${MECHAIN_HOME}
Restart=on-failure
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mechain-full
sudo systemctl start mechain-full
```

### Monitor Sync Progress

```bash
# View real-time logs
journalctl -u mechain-full -f

# Check sync status
med status --home ${MECHAIN_HOME} 2>&1 | jq .SyncInfo

# View current height
curl -s http://localhost:26657/status | jq .result.sync_info.latest_block_height

# Compare testnet height
curl -s https://beta-hub-26657.explorer-testnet.me/status | jq .result.sync_info.latest_block_height
```

---

## Deploy Consensus Node (Validator)

### Prerequisites

1. ✅ Deployed and fully synced full node
2. ✅ Sufficient LAT tokens (at least 100 LAT for staking)
3. ✅ Obtained test tokens from faucet
4. ✅ Configured monitoring and alerts

### Step 1: Create Validator Key

```bash
# Create operator account (for managing validator node, generate mnemonic and keys)
med keys add validator \
  --keyring-backend file \
  --home ${MECHAIN_HOME}

# Record mnemonic and address
# Address example: me1abc...xyz
VALIDATOR_ADDR=$(med keys show validator -a \
  --keyring-backend file \
  --home ${MECHAIN_HOME})

echo "Validator Address: ${VALIDATOR_ADDR}"
```

> **Security Tip:**
> 
> - Properly backup mnemonic, this is the only way to recover account
> - Recommend using hardware wallet (Ledger) to manage validator keys
> - Do not store mnemonic on server

### Step 2: Obtain Test Tokens

Visit faucet: https://www.mec.me/en-US/faucet

1. Input your validator address
2. Complete verification
3. Click "Claim Test Tokens"
4. Wait for transaction confirmation

```bash
# Query balance (check if account has sufficient tokens for staking)
med query bank balances ${VALIDATOR_ADDR} \
  --node https://beta-hub-1317.explorer-testnet.me

# Expected output includes at least 100000000ulat (100 LAT)
```

### Step 3: Create Validator

```bash
# Get node public key (need to provide this pubkey when creating validator)
VALIDATOR_PUBKEY=$(med tendermint show-validator --home ${MECHAIN_HOME})

echo "Validator PubKey: ${VALIDATOR_PUBKEY}"

# Create validator
med tx staking create-validator \
  --amount=100000000ulat \
  --pubkey="${VALIDATOR_PUBKEY}" \
  --moniker="My Validator" \
  --chain-id=mechain_400-1 \
  --commission-rate="0.10" \
  --commission-max-rate="0.20" \
  --commission-max-change-rate="0.01" \
  --min-self-delegation="1" \
  --gas="auto" \
  --gas-adjustment="1.5" \
  --gas-prices="0.001ulat" \
  --from=validator \
  --keyring-backend=file \
  --home=${MECHAIN_HOME} \
  --node=https://beta-hub-1317.explorer-testnet.me
```

**Parameter Description:**
- `--amount`: Staking amount (100 LAT)
- `--moniker`: Validator display name
- `--commission-rate`: Commission rate (10%)
- `--commission-max-rate`: Maximum commission rate (20%)
- `--commission-max-change-rate`: Commission change limit (1%/day)

### Step 4: Verify Creation Success

```bash
# Query validator information (check if validator created successfully and detailed info)
med query staking validator \
  $(med keys show validator --bech val -a \
    --keyring-backend file \
    --home ${MECHAIN_HOME}) \
  --node https://beta-hub-1317.explorer-testnet.me

# View in explorer
# https://explorer-testnet.mechain.io/validators
```

---

## Validator Operations

### Query Validator Status

```bash
# Query validator information
med query staking validator <validator-address> \
  --node https://beta-hub-1317.explorer-testnet.me

# Query signing status
med query slashing signing-info \
  $(med tendermint show-validator --home ${MECHAIN_HOME}) \
  --node https://beta-hub-1317.explorer-testnet.me

# Query delegations
med query staking delegations-to <validator-address> \
  --node https://beta-hub-1317.explorer-testnet.me
```

### Edit Validator Information

```bash
med tx staking edit-validator \
  --moniker="My New Moniker" \
  --website="https://myvalidator.com" \
  --details="A reliable validator" \
  --identity="<keybase-id>" \
  --commission-rate="0.05" \
  --from=validator \
  --chain-id=mechain_400-1 \
  --keyring-backend=file \
  --home=${MECHAIN_HOME} \
  --node=https://beta-hub-1317.explorer-testnet.me
```

### Unbond

```bash
med tx staking unbond \
  <validator-address> \
  50000000ulat \
  --from=validator \
  --chain-id=mechain_400-1 \
  --keyring-backend=file \
  --home=${MECHAIN_HOME} \
  --node=https://beta-hub-1317.explorer-testnet.me
```

### Unjail

If validator is jailed due to downtime:

```bash
med tx slashing unjail \
  --from=validator \
  --chain-id=mechain_400-1 \
  --keyring-backend=file \
  --home=${MECHAIN_HOME} \
  --node=https://beta-hub-1317.explorer-testnet.me
```

---

## Summary

Congratulations on completing Meta Earth testnet node deployment!

### Key Takeaways

- 🚀 Light nodes sync quickly, suitable for queries and wallets
- 💾 Full nodes provide complete data, suitable for API services
- 🏆 Validator nodes participate in consensus, earn rewards
- 🔒 Security first, regular backups and monitoring
- 📊 Continuous performance and reliability optimization

---

## Monitoring and Alerting

### Prometheus Monitoring

#### Enable Prometheus

Edit `config.toml`:

```toml
[instrumentation]
prometheus = true
prometheus_listen_addr = ":26660"
```

#### Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'mechain-validator'
    static_configs:
      - targets: ['localhost:26660']
```

####Key Metrics

- `tendermint_consensus_height`: Current block height
- `tendermint_consensus_validators`: Number of validators
- `tendermint_consensus_missing_validators`: Missing validators
- `tendermint_consensus_byzantine_validators`: Byzantine validators
- `tendermint_mempool_size`: Mempool size
- `tendermint_p2p_peers`: P2P connection count

### Grafana Dashboard

```bash
# Install Grafana
sudo apt-get install -y grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server

# Access http://localhost:3000
# Default username/password: admin/admin
```

Import community dashboards:
- ME Validator Dashboard: ID 11036
- Tendermint Dashboard: ID 7044

### Alert Rules

Create `alert-rules.yml`:

```yaml
groups:
  - name: validator_alerts
    rules:
      - alert: ValidatorDown
        expr: up{job="mechain-validator"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Validator is down"
      
      - alert: ValidatorMissedBlocks
        expr: increase(tendermint_consensus_validator_missed_blocks[5m]) > 10
        labels:
          severity: warning
        annotations:
          summary: "Validator missed blocks"
      
      - alert: LowPeerCount
        expr: tendermint_p2p_peers < 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Low peer count"
```

### Log Management

Use `logrotate` to manage logs:

```bash
# /etc/logrotate.d/mechain
${MECHAIN_HOME}/node.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $USER $USER
    postrotate
        systemctl reload mechain-full
    endscript
}
```

---

## Security Best Practices

### 1. Server Security

```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 26656/tcp  # P2P
sudo ufw enable

# Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# Use fail2ban
sudo apt-get install -y fail2ban
```

### 2. Key Management

- ✅ Use hardware wallets (Ledger, Trezor)
- ✅ Enable file encryption storage (keyring-backend=file)
- ✅ Regularly backup priv_validator_key.json
- ✅ Use multi-signature accounts for large funds

### 3. Double-Sign Protection

Configure `config.toml`:

```toml
[consensus]
double_sign_check_height = 0  # Prevent double signing
```

### 4. Backup Strategy

```bash
#!/bin/bash
# Backup script
BACKUP_DIR="/backup/mechain-$(date +%Y%m%d)"
mkdir -p ${BACKUP_DIR}

# Backup configuration
cp -r ${MECHAIN_HOME}/config ${BACKUP_DIR}/

# Backup keys
cp ${MECHAIN_HOME}/config/priv_validator_key.json ${BACKUP_DIR}/
cp ${MECHAIN_HOME}/data/priv_validator_state.json ${BACKUP_DIR}/

# Encrypt backup
tar -czf ${BACKUP_DIR}.tar.gz ${BACKUP_DIR}
gpg -c ${BACKUP_DIR}.tar.gz
rm -rf ${BACKUP_DIR} ${BACKUP_DIR}.tar.gz
```

---

## FAQ

### 1. Node syncing very slowly?

**Solutions:**
- Use State Sync or snapshots
- Check network bandwidth
- Increase peer connections
- Use SSD storage

### 2. Validator got jailed?

**Reasons:**
- Extended downtime (missed signatures)
- Double signing (running multiple identical validator instances)

**Solution:**
```bash
# Check jail reason
med query slashing signing-info $(med tendermint show-validator)

# Unjail
med tx slashing unjail --from validator
```

### 3. How to reduce downtime?

- Configure sentry nodes
- Use backup servers
- Set up automatic restart
- Configure monitoring alerts

### 4. Running out of memory?

```bash
# Add swap (temporary solution)
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Adjust IAVL cache
# app.toml
[iavl]
cache-size = 500000  # Reduce cache
```

### 5. How to upgrade node?

```bash
# 1. Backup data
tar -czf backup.tar.gz ${MECHAIN_HOME}

# 2. Stop node
sudo systemctl stop mechain-full

# 3. Download new version
wget <new-version-url>
sudo mv med /usr/local/bin/

# 4. Start node
sudo systemctl start mechain-full

# 5. Verify
med version
```

---

## Getting Help

### Official Resources

- **Documentation**: https://docs.mec.me
- **GitHub**: https://github.com/openmetaearth/me-hub
- **Explorer**: https://www.explorer-testnet.me

### Community Support

- **Telegram**: https://t.me/metaearthdevs

### Reporting Issues

When submitting an issue, please include:
- Node version and operating system
- Error logs
- Reproduction steps
- Configuration files (hide sensitive information)

---

## Appendix

### A. Quick Command Reference

```bash
# Node management
med start                          # Start node
med status                         # Check status
med version                        # Check version

# Key management
med keys list                      # List all keys
med keys add <name>                # Create new key
med keys show <name>               # Show key info

# Queries
med query bank balances <address>  # Query balance
med query staking validators       # Query validators
med query staking validator <val>  # Query specific validator

# Transactions
med tx bank send <from> <to> <amount>         # Transfer
med tx staking create-validator [flags]       # Create validator
med tx staking delegate <val> <amount>        # Delegate
med tx slashing unjail                        # Unjail

# Governance
med query gov proposals            # Query proposals
med tx gov vote <id> <option>      # Vote
```

### B. Port Reference

| Port | Purpose |
|------|---------|
| 26656 | P2P communication |
| 26657 | RPC endpoint |
| 26660 | Prometheus metrics |
| 1317 | REST API |
| 9090 | gRPC |

### C. Validator Tier Recommendations

| Tier | Stake Amount | Commission | Uptime |
|------|--------------|------------|--------|
| Entry | 100-1K LAT | 10-20% | 95%+ |
| Intermediate | 1K-10K LAT | 5-10% | 98%+ |
| Professional | 10K+ LAT | 1-5% | 99.9%+ |

---

**Document Version**: v2.0.0  
**Applicable Testnet**: mechain_400-1  
**Last Updated**: 2026-01-09  
**Maintainer**: Meta Earth Development Team

For questions, contact: support@mechain.io

