---
sidebar_position: 2
title: Mainnet Node Setup Guide
---

# Meta Earth Mainnet Node Deployment Guide

## 📖 Overview

This guide will help you deploy and run production-grade nodes on the Meta Earth mainnet. Mainnet nodes are used in official production environments where all assets have real value.

> ⚠️ **Important Notice**: Mainnet deployment involves real assets. Please ensure you fully understand the operating procedures and security requirements before proceeding with deployment.

---

## 🎯 Node Types

### Full Node

**Uses:**
- Provide RPC/API services
- Data query and analysis
- DApp backend support

**Configuration Requirements:**
- CPU: 8 cores 3.0GHz+
- Memory: 32GB RAM
- Disk: 2TB NVMe SSD
- Network: 100Mbps+

### Consensus Node (Validator)

**Uses:**
- Participate in network consensus
- Produce blocks
- Earn staking rewards

**Configuration Requirements:**
- CPU: 16 cores 3.5GHz+
- Memory: 64GB RAM
- Disk: 4TB NVMe SSD
- Network: 1Gbps
- Backup server (strongly recommended)

---

## 📋 Prerequisites

### 1. Hardware Preparation

- ✅ Servers meeting configuration requirements
- ✅ Stable network connection (99.9%+ uptime)
- ✅ Uninterruptible Power Supply (UPS)
- ✅ Redundant network access

### 2. Software Environment

- Ubuntu 22.04 LTS or higher
- Go 1.23+ (required for building from source)
- Git
- Make
- Docker (optional)

### 3. Staking Tokens (Validator Nodes)

- At least 10,000 MEC for staking
- Additional MEC for transaction fees
- Recommend holding more to improve competitiveness

---

## 🚀 Deployment Steps

### Step 1: System Preparation

```bash
# Update system (ensure system packages are up to date)
sudo apt-get update && sudo apt-get upgrade -y

# Install dependencies (install basic tools required for node operation)
sudo apt-get install -y curl wget jq git build-essential

# Configure firewall (protect node security, open only necessary ports)
sudo ufw default deny incoming   # Deny all incoming connections by default
sudo ufw default allow outgoing  # Allow all outgoing connections by default
sudo ufw allow ssh               # Allow SSH remote management
sudo ufw allow 26656/tcp  # P2P  # Allow P2P node communication port
sudo ufw enable                  # Enable firewall

# Time synchronization (ensure node time accuracy, avoid consensus failure)
sudo apt-get install -y ntp      # Install NTP time sync service
sudo systemctl enable ntp        # Set to start on boot
sudo systemctl start ntp         # Start NTP service
```

### Step 2: Build from Source

```bash
# Create directory
export MECHAIN_HOME="${HOME}/.mechain"
mkdir -p ${MECHAIN_HOME}

# Clone the me-hub repository (get latest source code from GitHub)
cd ~
git clone https://github.com/openmetaearth/me-hub.git
cd me-hub

# Checkout to stable branch/tag (replace with actual version when available)
# git checkout vX.X.X

# Build and install (compile source code and install to system path)
make install

# Verify installation (check version number to confirm successful installation)
med version
```


### Step 3: Configure Node

Edit `${MECHAIN_HOME}/config/config.toml`:

```toml
# P2P Configuration
[p2p]
seeds = "mainnet seed node addresses"          # Seed node list for node discovery
persistent_peers = "mainnet persistent peers"  # Persistent peer node list
max_num_inbound_peers = 40                     # Maximum inbound connections
max_num_outbound_peers = 10                    # Maximum outbound connections

# RPC Configuration
[rpc]
laddr = "tcp://127.0.0.1:26657"               # RPC listen address, production recommend local only (127.0.0.1)
cors_allowed_origins = ["*"]                  # Allowed CORS origins
```

Edit `${MECHAIN_HOME}/config/app.toml`:

```toml
# Minimum gas price (mainnet actual price)
minimum-gas-prices = "0.025umec"              # Minimum gas price node accepts, transactions below this will be rejected

# Data retention (full node retains all data)
pruning = "nothing"                           # No pruning, retain all historical data

# API Configuration (enable as needed)
[api]
enable = true                                  # Enable REST API service
swagger = false                                # Disable Swagger docs in production (security consideration)
address = "tcp://127.0.0.1:1317"              # REST API listen address, local access only
```

### Step 4: Configure System Service

```bash
sudo tee /etc/systemd/system/mechain.service > /dev/null <<EOF
[Unit]
Description=Meta Earth Mainnet Node
After=network-online.target

[Service]
User=$USER
ExecStart=/usr/local/bin/med start --home ${MECHAIN_HOME}
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload  # Reload systemd configuration
sudo systemctl enable mechain # Set to start automatically on boot
sudo systemctl start mechain  # Start node service
```

### Step 5: Monitor Sync Status

```bash
# View logs (real-time monitor node operation status and error messages)
journalctl -u mechain -f

# Check sync status (check if node has caught up to latest blocks)
med status --home ${MECHAIN_HOME} 2>&1 | jq .SyncInfo

# View current height (get current block height node has synced to)
curl -s http://localhost:26657/status | jq .result.sync_info
```

---

## 🏆 Deploy Validator Node (Optional)

### Prerequisites

- ✅ Full node fully synchronized
- ✅ Sufficient MEC tokens
- ✅ Key management configured
- ✅ Monitoring and alert system configured

### Create Validator

```bash
# Create validator key (using hardware wallet is more secure)
med keys add validator \
  --keyring-backend file \
  --home ${MECHAIN_HOME}

# Record address and mnemonic (store securely!)
VALIDATOR_ADDR=$(med keys show validator -a \
  --keyring-backend file \
  --home ${MECHAIN_HOME})

# Get node public key
VALIDATOR_PUBKEY=$(med tendermint show-validator --home ${MECHAIN_HOME})

# Create validator (adjust parameters according to actual situation)
med tx staking create-validator \
  --amount=10000000000umec \                             # Staking amount (10,000 MEC)
  --pubkey="${VALIDATOR_PUBKEY}" \                      # Validator node public key
  --moniker="Your Validator Name" \                     # Validator display name
  --chain-id=me-chain \                         # Mainnet chain ID
  --commission-rate="0.05" \                             # Commission rate 5%
  --commission-max-rate="0.20" \                         # Max commission rate 20%
  --commission-max-change-rate="0.01" \                  # Max daily commission change 1%
  --min-self-delegation="1" \                            # Minimum self-delegation
  --gas="auto" \                                         # Auto estimate gas
  --gas-adjustment="1.5" \                               # Gas adjustment factor 1.5x
  --gas-prices="0.025umec" \                             # Gas price
  --from=validator \                                     # Account sending transaction
  --keyring-backend=file \                               # Keyring backend type
  --home=${MECHAIN_HOME}                                 # Node data home directory
```

---

## 🔒 Security Best Practices

### 1. Key Management

- ✅ Use hardware wallets (Ledger/Trezor)
- ✅ Multi-signature for important accounts
- ✅ Encrypt backup of all key files
- ✅ Regularly rotate management keys
- ✅ Use HSM (Hardware Security Module)

### 2. Network Security

```bash
# Limit SSH access
sudo ufw allow from specific_IP to any port 22

# Disable password login, use SSH keys only
sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# Install fail2ban
sudo apt-get install -y fail2ban
```

### 3. Validator Protection

- Configure sentry node architecture
- Use private network connection for validator
- Configure DDoS protection
- Implement access control lists

### 4. Monitoring and Alerting

- Prometheus + Grafana monitoring
- Key metric alerts
- Log aggregation and analysis
- 24/7 on-call response

---

## 📊 Performance Optimization

### Database Optimization

```toml
# app.toml
[state-sync]
snapshot-interval = 1000
snapshot-keep-recent = 2
```

### Memory Optimization

```toml
# app.toml
[iavl]
cache-size = 781250  # Adjust according to available memory
```

---

## 🔧 Operations Guide

### Backup Strategy

```bash
# Regular backup of key files
#!/bin/bash
BACKUP_DIR="/backup/mechain-$(date +%Y%m%d)"
mkdir -p ${BACKUP_DIR}

# Backup config and keys
cp -r ${MECHAIN_HOME}/config ${BACKUP_DIR}/
cp ${MECHAIN_HOME}/data/priv_validator_key.json ${BACKUP_DIR}/
cp ${MECHAIN_HOME}/data/priv_validator_state.json ${BACKUP_DIR}/

# Encrypt backup
tar -czf ${BACKUP_DIR}.tar.gz ${BACKUP_DIR}
gpg -c ${BACKUP_DIR}.tar.gz
```

### Upgrade Process

1. Follow official upgrade announcements
2. Verify new version in test environment
3. Backup current data
4. Replace binary before upgrade height
5. Verify upgrade success

---

## ❓ FAQ


### 1. What to do if validator is jailed?

```bash
# Check jail reason
med query slashing signing-info $(med tendermint show-validator)

# Unjail
med tx slashing unjail --from validator --chain-id me-chain
```

### 2. How to improve validator ranking?

- Increase staking amount
- Maintain high uptime (99.9%+)
- Actively participate in community governance
- Provide quality services

---

## 📚 Related Resources

- [Testnet Deployment Guide](testnet-node-setup-guide) - Practice on testnet first
- [Node Deployment Navigation](node) - Choose appropriate deployment method
- [Private Network Deployment](private-network-setup-guide) - Internal test environment

### Official Resources

- **Documentation**: https://docs.mec.me
- **Explorer**: https://explorer.mec.me

### Community Support

- **Telegram**: https://t.me/metaearthdevs

---

## 🎯 Operating Metrics

### Validator Key Metrics

| Metric | Target Value |
|--------|--------------|
| Uptime | 99.9%+ |
| Block Signing Rate | 99%+ |
| Response Time | < 3s |
| Operational Uptime | 99.9%+ |

---

**Document Version**: v2.0.0  
**Applicable Mainnet**: me-chain  
**Last Updated**: 2026-01-09  
**Maintainer**: Meta Earth Development Team

> ⚠️ **Production Environment Reminder**
> 
> Mainnet operation involves real assets, please ensure:
> - Thoroughly test all operating procedures
> - Configure comprehensive monitoring and alerting
> - Prepare emergency response plans
> - Regularly backup critical data
> - Purchase appropriate insurance

For questions, contact: mainnet-support@mechain.io

