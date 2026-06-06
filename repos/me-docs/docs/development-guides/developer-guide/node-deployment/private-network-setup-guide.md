---
sidebar_position: 3
title: Private Network Setup Guide
---

# Meta Earth Private Network Deployment Guide

This guide will walk you through deploying a complete Meta Earth private blockchain network from scratch, including Hub nodes and DA (Data Availability) nodes, for isolated development, testing, and enterprise application environments.

---

## Overview

### Use Cases

Private blockchain networks are suitable for:

- 🏢 **Enterprise Internal Networks**: Manage internal supply chain, finance systems
- 🧪 **Testing and Development**: Isolated environment for rapid iteration
- 🎓 **Educational Training**: Learn blockchain concepts without cost
- 🔐 **Data Privacy Requirements**: Complete control over data and access
- 💼 **Consortium Blockchains**: Multi-organization collaboration networks

### Network Architecture

```
┌──────────────────────────────────────────────────────┐
│                 Private Network                       │
│                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Hub Node 1  │  │  Hub Node 2  │  │  Hub Node 3  │ │
│  │  (Validator) │  │  (Validator) │  │  (Full Node) │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                 │          │
│         └────────┬────────┴────────┬────────┘         │
│                  │  P2P Network    │                   │
│         ┌────────┴─────────────────┴────────┐         │
│         │                                    │         │
│  ┌──────┴──────┐                   ┌────────┴──────┐ │
│  │  DA Node 1   │                   │  DA Node 2    │ │
│  │  (Validator) │                   │  (Full Node)  │ │
│  └──────────────┘                   └───────────────┘ │
└──────────────────────────────────────────────────────┘
```

---

## Environment Requirements

### Hardware Configuration

| Component | Minimum Configuration | Recommended Configuration |
|-----------|----------------------|--------------------------|
| CPU | 4 cores | 8 cores |
| Memory | 8GB | 16GB |
| Disk | 100GB SSD | 500GB NVMe SSD |
| Network | 10MB/s | 100MB/s |

### Software Dependencies

- Operating System: Ubuntu 20.04+ or macOS
- Docker: v20.10+ (for Docker deployment)
- Docker Compose: v1.29+ (for Docker deployment)
- Go: v1.23+ (required for building from source)
- Git
- Make

---

## Quick Deployment (Docker)

### Step 1: Clone Repository and Initialize Environment

```bash
# Set base directory
export BASE_DIR="${HOME}/mechain-private"
mkdir -p ${BASE_DIR}
cd ${BASE_DIR}

# Clone the me-hub repository
git clone https://github.com/openmetaearth/me-hub.git
cd me-hub

# Check if init-env.sh script exists, if so run it
# Note: This script may not be available in the repository yet
if [ -f "scripts/init-env.sh" ]; then
  bash scripts/init-env.sh
else
  echo "Initialization script not found. Please follow the manual deployment steps below."
fi
```

**Script Functionality:**
- Automatically create node directories
- Generate genesis files
- Initialize validators and accounts
- Configure P2P network
- Create docker-compose configuration

### Step 2: Start Network

```bash
# Start all nodes (including Hub nodes and DA nodes)
docker-compose up -d

# View running containers (verify all nodes started successfully)
docker-compose ps

# View logs (check if nodes are producing blocks normally)
docker-compose logs -f hub-node1
```

### Step 3: Verify Network

```bash
# Query node status (check sync status and latest block height)
curl -s http://localhost:26657/status | jq .

# Query validator set (view all validator information participating in consensus)
curl -s http://localhost:26657/validators | jq .

# View blocks (real-time view of block generation)
curl -s http://localhost:26657/block | jq .result.block.header
```

---

## Manual Deployment (Detailed Steps)

If you need more customization control, follow these manual deployment steps.

### Step 1: Install Node Program

```bash
# Create directory structure
export BASE_DIR="${HOME}/mechain-private"
mkdir -p ${BASE_DIR}/{med,nodes/{hub-nodes,da-nodes}}

# Compile from source (recommended)
cd ${BASE_DIR}
git clone https://github.com/openmetaearth/me-hub.git
cd me-hub
make install

# The binary will be installed to $GOPATH/bin or $HOME/go/bin
# Create a symlink or copy it to your preferred location
mkdir -p ${BASE_DIR}/med/bin
cp $(which med) ${BASE_DIR}/med/bin/ || cp ~/go/bin/med ${BASE_DIR}/med/bin/

# Verify installation
${BASE_DIR}/med/bin/med version
```

### Step 2: Initialize Node

#### Initialize Hub Node 1

```bash
# Initialize node (create configuration files and data directory)
${BASE_DIR}/med/bin/med init node1 \
  --chain-id mycompany_chain_1 \
  --home ${BASE_DIR}/nodes/hub-nodes/node1
```

#### Create Account Keys

```bash
# Create validator account (for creating validator and staking)
${BASE_DIR}/med/bin/med keys add validator \
  --keyring-backend file \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# Create administrator account (for managing network parameters)
${BASE_DIR}/med/bin/med keys add admin \
  --keyring-backend file \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# Record account addresses (for adding to genesis file)
VALIDATOR_ADDR=$(${BASE_DIR}/med/bin/med keys show validator -a \
  --keyring-backend file \
  --home ${BASE_DIR}/nodes/hub-nodes/node1)
ADMIN_ADDR=$(${BASE_DIR}/med/bin/med keys show admin -a \
  --keyring-backend file \
  --home ${BASE_DIR}/nodes/hub-nodes/node1)

echo "Validator Address: ${VALIDATOR_ADDR}"
echo "Admin Address: ${ADMIN_ADDR}"
```

### Step 3: Configure Genesis File

#### Add Genesis Accounts

```bash
# Add validator account to genesis file (allocate initial balance)
${BASE_DIR}/med/bin/med add-genesis-account \
  ${VALIDATOR_ADDR} 1000000000000umec \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# Add administrator account (allocate initial balance)
${BASE_DIR}/med/bin/med add-genesis-account \
  ${ADMIN_ADDR} 1000000000000umec \
  --home ${BASE_DIR}/nodes/hub-nodes/node1
```

#### Add Genesis Stake Pool

```bash
# Add stake pool to genesis file (reserve funds for early staking)
${BASE_DIR}/med/bin/med add-genesis-stake-pool \
  500000000000umec \
  --home ${BASE_DIR}/nodes/hub-nodes/node1
```

#### Create Genesis Transaction

```bash
# Create gentx (pre-sign validator transaction, include in genesis file)
${BASE_DIR}/med/bin/med gentx validator \
  100000000umec \
  --chain-id mycompany_chain_1 \
  --moniker "node1-validator" \
  --commission-rate 0.1 \
  --commission-max-rate 0.2 \
  --commission-max-change-rate 0.01 \
  --min-self-delegation 1 \
  --keyring-backend file \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# Collect gentxs (collect all validator genesis transactions into genesis file)
${BASE_DIR}/med/bin/med collect-gentxs \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# Validate genesis file (verify genesis file format correctness)
${BASE_DIR}/med/bin/med validate-genesis \
  --home ${BASE_DIR}/nodes/hub-nodes/node1
```

### Step 4: Modify Configuration Files

#### Edit config.toml

```bash
# Edit node configuration file
vim ${BASE_DIR}/nodes/hub-nodes/node1/config/config.toml
```

**Key Configuration Items:**

```toml
# Consensus configuration
[consensus]
timeout_commit = "1s"  # Consensus commit timeout, 1 second for fast testing (mainnet usually 3-5s)

# RPC configuration
[rpc]
laddr = "tcp://0.0.0.0:26657"             # RPC listen address, 0.0.0.0 listens on all interfaces
cors_allowed_origins = ["*"]               # Allow all origins for CORS requests (restrict in production)

# P2P configuration
[p2p]
laddr = "tcp://0.0.0.0:26656"             # P2P listen address
pex = true                                 # Enable peer exchange, automatic peer discovery
persistent_peers = ""                      # Persistent peer list, fill in after multi-node setup
private_peer_ids = ""                      # Private peer IDs, don't broadcast these peer addresses

# Transaction indexing
[tx_index]
indexer = "kv"                            # Use KV storage to index transactions, enable historical queries
```

#### Edit app.toml

```bash
vim ${BASE_DIR}/nodes/hub-nodes/node1/config/app.toml
```

**Key Configuration Items:**

```toml
# API configuration
[api]
enable = true                              # Enable REST API service
address = "tcp://0.0.0.0:1317"            # REST API listen address and port
swagger = true                             # Enable Swagger documentation

# gRPC configuration
[grpc]
enable = true                              # Enable gRPC service
address = "0.0.0.0:9090"                  # gRPC listen address and port

# Gas and fee configuration
minimum-gas-prices = "0.001umec"          # Minimum gas price, transactions below will be rejected

# State sync and snapshot
[state-sync]
snapshot-interval = 1000                   # Create snapshot every 1000 blocks
snapshot-keep-recent = 2                   # Keep last 2 snapshots
```

### Step 5: Configure Multi-Node Network

#### Initialize Node 2 and Node 3

```bash
# Initialize node 2
${BASE_DIR}/med/bin/med init node2 \
  --chain-id mycompany_chain_1 \
  --home ${BASE_DIR}/nodes/hub-nodes/node2

# Initialize node 3
${BASE_DIR}/med/bin/med init node3 \
  --chain-id mycompany_chain_1 \
  --home ${BASE_DIR}/nodes/hub-nodes/node3
```

#### Get Node IDs

```bash
# Get node 1 ID (for P2P connection configuration)
NODE1_ID=$(${BASE_DIR}/med/bin/med tendermint show-node-id \
  --home ${BASE_DIR}/nodes/hub-nodes/node1)

echo "Node 1 ID: ${NODE1_ID}"

# Get node 2 and node 3 IDs
NODE2_ID=$(${BASE_DIR}/med/bin/med tendermint show-node-id \
  --home ${BASE_DIR}/nodes/hub-nodes/node2)
NODE3_ID=$(${BASE_DIR}/med/bin/med tendermint show-node-id \
  --home ${BASE_DIR}/nodes/hub-nodes/node3)
```

#### Configure P2P Connections

**For single-machine multi-node:**

```bash
# Node 2 connects to node 1 (use localhost)
# Format: <NODE_ID>@<IP>:<PORT>
PERSISTENT_PEERS="${NODE1_ID}@localhost:26656"

# Edit node 2 config.toml
sed -i "s/persistent_peers = \"\"/persistent_peers = \"${PERSISTENT_PEERS}\"/" \
  ${BASE_DIR}/nodes/hub-nodes/node2/config/config.toml

# Similarly configure node 3
```

**For multi-server deployment:**

```bash
# Node 2 connects to node 1 (use actual IP)
# Assuming node 1 IP is 192.168.1.101
PERSISTENT_PEERS="${NODE1_ID}@192.168.1.101:26656"

sed -i "s/persistent_peers = \"\"/persistent_peers = \"${PERSISTENT_PEERS}\"/" \
  ${BASE_DIR}/nodes/hub-nodes/node2/config/config.toml
```

#### Sync Genesis Files

```bash
# Copy genesis file from node 1 to other nodes
cp ${BASE_DIR}/nodes/hub-nodes/node1/config/genesis.json \
  ${BASE_DIR}/nodes/hub-nodes/node2/config/

cp ${BASE_DIR}/nodes/hub-nodes/node1/config/genesis.json \
  ${BASE_DIR}/nodes/hub-nodes/node3/config/
```

**For multi-server:**

```bash
# Use scp to copy genesis file to other servers
scp ${BASE_DIR}/nodes/hub-nodes/node1/config/genesis.json \
  user@192.168.1.102:${BASE_DIR}/nodes/hub-nodes/node2/config/

scp ${BASE_DIR}/nodes/hub-nodes/node1/config/genesis.json \
  user@192.168.1.103:${BASE_DIR}/nodes/hub-nodes/node3/config/
```

### Step 6: Start Nodes

#### Start Node 1

```bash
# Foreground start (for testing)
${BASE_DIR}/med/bin/med start \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# Background start (for production)
nohup ${BASE_DIR}/med/bin/med start \
  --home ${BASE_DIR}/nodes/hub-nodes/node1 \
  > ${BASE_DIR}/nodes/hub-nodes/node1/node.log 2>&1 &
```

#### Start Nodes 2 and 3

```bash
# Start node 2
nohup ${BASE_DIR}/med/bin/med start \
  --home ${BASE_DIR}/nodes/hub-nodes/node2 \
  > ${BASE_DIR}/nodes/hub-nodes/node2/node.log 2>&1 &

# Start node 3
nohup ${BASE_DIR}/med/bin/med start \
  --home ${BASE_DIR}/nodes/hub-nodes/node3 \
  > ${BASE_DIR}/nodes/hub-nodes/node3/node.log 2>&1 &
```

### Step 7: Verify Network

```bash
# Check node 1 status (verify node running and block generation)
${BASE_DIR}/med/bin/med status \
  --node tcp://localhost:26657 | jq .

# Check peer connections (verify node connected to other nodes)
curl -s http://localhost:26657/net_info | jq .result.n_peers

# View latest block (check consensus working normally)
curl -s http://localhost:26657/block | jq .result.block.header
```

---

## Network Parameter Configuration

### Custom Chain Parameters

Private networks allow you to customize various chain parameters.

#### Consensus Parameters

Edit genesis file `genesis.json`:

```json
{
  "consensus_params": {
    "block": {
      "max_bytes": "4194304",                    // Maximum block size: 4MB (maximum bytes a single block can contain)
      "max_gas": "-1",                            // Maximum Gas: unlimited (-1 means no limit on total Gas consumption per block)
      "time_iota_ms": "1000"                      // Block time interval: 1 second (minimum increment of block timestamp, in milliseconds)
    },
    "evidence": {
      "max_age_num_blocks": "100000",            // Evidence maximum block age (valid block count for malicious behavior evidence)
      "max_age_duration": "172800000000000"      // Evidence maximum time age (valid time for malicious behavior evidence, in nanoseconds, 48 hours)
    },
    "validator": {
      "pub_key_types": ["ed25519"]               // Validator public key type (supported public key algorithms)
    }
  }
}
```

#### Governance Parameters

```json
{
  "app_state": {
    "gov": {
      "voting_params": {
        "voting_period": "300s"                  // Voting period: 5 minutes (duration after proposal enters voting phase)
      },
      "deposit_params": {
        "min_deposit": [                         // Minimum deposit requirement (amount needed for proposal to enter voting)
          {
            "denom": "umec",                      // Deposit token type
            "amount": "1000000"                   // Minimum deposit amount: 1 MEC (1000000 umec = 1 MEC)
          }
        ],
        "max_deposit_period": "600s"            // Maximum deposit period: 10 minutes (maximum time from proposal submission to reaching minimum deposit)
      }
    }
  }
}
```

#### Staking Parameters

```json
{
  "app_state": {
    "staking": {
      "params": {
        "unbonding_time": "1800s",                // Unbonding time: 30 minutes (waiting time from unstaking to tokens becoming available)
        "max_validators": 100,                     // Maximum validators (maximum number in active validator set)
        "max_entries": 7,                          // Maximum operation entries (concurrent unbonding/redelegation count per delegator-validator pair)
        "historical_entries": 10000,               // Historical entries (number of historical state snapshots retained for querying historical information)
        "bond_denom": "umec"                       // Staking token type (token denomination used for staking)
      }
    }
  }
}
```

### Custom Token Parameters

#### Token Name and Symbol

```json
{
  "app_state": {
    "bank": {
      "denom_metadata": [
        {
          "base": "utoken",                          // Minimum unit denomination (base unit for on-chain storage and calculation)
          "denom_units": [
            {
              "denom": "utoken",                     // Minimum unit name (corresponds to base field)
              "exponent": 0                          // Exponent 0, indicates this is the base unit
            },
            {
              "denom": "TOKEN",                      // Display unit name (unit users see)
              "exponent": 6                          // Exponent 6, i.e., 1 TOKEN = 10^6 utoken (1 million minimum units)
            }
          ],
          "description": "My Private Chain Token",   // Token description
          "display": "TOKEN",                        // Default display unit (used in wallets and block explorers)
          "name": "My Token",                        // Token full name
          "symbol": "MTK"                            // Token symbol (typically 3-4 uppercase letters)
        }
      ]
    }
  }
}
```

#### Initial Token Distribution

```bash
# Allocate initial tokens to accounts
${BASE_DIR}/med/bin/med add-genesis-account \
  <address> \
  1000000000utoken \
  --home "${NODE_HOME}"
```

---

## Multi-Server Deployment

### Network Topology

```
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│  Server 1   │           │  Server 2   │           │  Server 3   │
│ 192.168.1.101│◄─────────►│192.168.1.102│◄─────────►│192.168.1.103│
│             │           │             │           │             │
│  Hub Node 1  │           │  Hub Node 2  │           │  Hub Node 3  │
│  (Validator) │           │  (Validator) │           │  (Full Node) │
└─────────────┘           └─────────────┘           └─────────────┘
```

### Firewall Configuration

```bash
# On each server, allow P2P port
sudo ufw allow 26656/tcp comment 'P2P Port'

# Allow RPC port from internal network only
sudo ufw allow from 192.168.1.0/24 to any port 26657 proto tcp

# Allow API port from internal network only
sudo ufw allow from 192.168.1.0/24 to any port 1317 proto tcp

# Enable firewall
sudo ufw enable
```

---

## Access Control

### Method 1: Bind to Internal IP Only

Edit `config.toml`:

```toml
[rpc]
laddr = "tcp://192.168.1.101:26657"  # Only listen on internal network IP

[api]
address = "tcp://192.168.1.101:1317"  # API also bound to internal IP
```

### Method 2: Nginx Reverse Proxy with Authentication

#### Install Nginx

```bash
sudo apt-get install -y nginx apache2-utils
```

#### Configure HTTP Basic Auth

```bash
# Create password file
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Input password
```

#### Configure Nginx

Create `/etc/nginx/sites-available/mechain`:

```nginx
server {
    listen 80;
    server_name mechain.company.com;

    location / {
        auth_basic "Restricted Access";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://127.0.0.1:1317;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable configuration:

```bash
sudo ln -s /etc/nginx/sites-available/mechain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Method 3: VPN Access

Use WireGuard or OpenVPN to establish VPN, only allow access to blockchain nodes over VPN.

---

## Smart Contract Deployment Permissions

### Whitelist Mechanism

Use governance to create whitelist, only allow specific addresses to deploy contracts

---

## Performance Optimization

### Database Backend Selection

Edit `app.toml`:

```toml
[app-db-backend]
type = "rocksdb"  # Options: leveldb, rocksdb (rocksdb recommended for better performance)
```

### State Sync and Snapshots

```toml
[state-sync]
snapshot-interval = 1000    # Create snapshot every 1000 blocks (enable state sync for new nodes)
snapshot-keep-recent = 2     # Keep last 2 snapshots (save disk space)
```

### IAVL Cache Tuning

```toml
[iavl-config]
cache-size = 781250  # IAVL cache size (adjust based on memory, larger = faster queries)
```

### Docker Resource Limits

In `docker-compose.yml`:

```yaml
services:
  hub-node1:
    image: mechain/mechain:latest
    deploy:
      resources:
        limits:
          cpus: '4.0'       # Limit to 4 CPU cores
          memory: 8G         # Limit to 8GB memory
        reservations:
          cpus: '2.0'
          memory: 4G
```

### Disk I/O Optimization

- Use SSD storage
- Enable data pruning

```toml
pruning = "custom"           # Custom pruning strategy
pruning-keep-recent = "100"  # Keep last 100 block states (save disk)
pruning-interval = "10"      # Prune every 10 blocks
```

---

## Monitoring and Logs

### Enable Prometheus Monitoring

Edit `config.toml`:

```toml
# Instrumentation configuration
instrumentation = true        # Enable instrumentation

# Prometheus metrics
prometheus = true              # Enable Prometheus metrics export
prometheus_listen_addr = ":26660"  # Prometheus listen port
```

### Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s      # Scrape metrics every 15 seconds

scrape_configs:
  - job_name: 'hub-node1'
    static_configs:
      - targets: ['localhost:26660']  # Hub node 1 metrics endpoint
  
  - job_name: 'hub-node2'
    static_configs:
      - targets: ['localhost:26661']  # Hub node 2 metrics endpoint
  
  - job_name: 'da-node1'
    static_configs:
      - targets: ['localhost:26662']  # DA node metrics endpoint
```

Start Prometheus:

```bash
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

### Configure Grafana

```bash
docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

Visit http://localhost:3000, add Prometheus data source.

### Log Management

#### Configure Log Level

Edit `config.toml`:

```toml
log_level = "info"  # Log level, options: debug (debugging), info (information), warn (warning), error (error)

# Or configure per module
log_level = "main:info,state:info,statesync:info,*:error"  # Set different log levels for different modules
```

#### Log Rotation

Create `/etc/logrotate.d/mechain`:

```
/var/log/mechain/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 mechain mechain
}
```

---

## Backup and Recovery

### Backup Strategy

#### 1. Backup Critical Data

```bash
#!/bin/bash
# Backup script (regularly backup critical data to prevent data loss)
BACKUP_DIR="/backup/mechain-$(date +%Y%m%d)"
mkdir -p ${BACKUP_DIR}  # Create date-named backup directory

# Backup configuration files (save node configuration for quick recovery)
cp -r ${BASE_DIR}/nodes/hub-nodes/node1/config ${BACKUP_DIR}/

# Backup keys (save node identity and validator keys)
cp -r ${BASE_DIR}/nodes/hub-nodes/node1/data/node_key.json ${BACKUP_DIR}/
cp -r ${BASE_DIR}/nodes/hub-nodes/node1/data/priv_validator_key.json ${BACKUP_DIR}/

# Backup blockchain data (optional, large data volume, backup as needed)
tar -czf ${BACKUP_DIR}/blockchain-data.tar.gz \
  ${BASE_DIR}/nodes/hub-nodes/node1/data
```

#### 2. Scheduled Backups

Add to crontab:

```bash
# Backup every day at 2 AM
0 2 * * * /path/to/backup-script.sh
```

### Recovery Process

#### Restore Node from Backup

```bash
# 1. Stop node (prepare for data recovery)
docker-compose stop hub-node1

# 2. Restore configuration and keys (restore node configuration from backup)
cp -r /backup/mechain-20260109/config/* \
  ${BASE_DIR}/nodes/hub-nodes/node1/config/  # Restore configuration files
cp /backup/mechain-20260109/node_key.json \
  ${BASE_DIR}/nodes/hub-nodes/node1/data/    # Restore node key
cp /backup/mechain-20260109/priv_validator_key.json \
  ${BASE_DIR}/nodes/hub-nodes/node1/data/    # Restore validator key

# 3. Restore blockchain data (if complete data needed)
tar -xzf /backup/mechain-20260109/blockchain-data.tar.gz \
  -C ${BASE_DIR}/nodes/hub-nodes/node1/

# 4. Start node (restart node after recovery complete)
docker-compose start hub-node1
```

---

## Network Upgrades

### Planned Upgrades

#### 1. Prepare New Version

```bash
# Download new version binary (obtain latest version node program)
wget <NEW_VERSION_URL> -O ${BASE_DIR}/med/bin/med-v2.0.0
chmod +x ${BASE_DIR}/med/bin/med-v2.0.0  # Add execute permission

# Verify version (confirm downloaded version correct)
${BASE_DIR}/med/bin/med-v2.0.0 version
```

#### 2. Create Upgrade Proposal

```bash
# Create upgrade proposal (upgrade network version through governance process)
${BASE_DIR}/med/bin/med tx gov submit-proposal software-upgrade v2.0.0 \
  --title "Upgrade to v2.0.0" \
  --description "Upgrade network to version 2.0.0" \
  --upgrade-height 100000 \
  --deposit 10000000umec \
  --from admin \
  --chain-id mycompany_chain_1 \
  --home ${BASE_DIR}/nodes/hub-nodes/node1
```

#### 3. Vote and Approve

```bash
# Query proposal ID (get just submitted upgrade proposal number)
PROPOSAL_ID=$(${BASE_DIR}/med/bin/med query gov proposals \
  --home ${BASE_DIR}/nodes/hub-nodes/node1 -o json | \
  jq -r '.proposals[-1].proposal_id')

# Vote (validators vote on upgrade proposal)
${BASE_DIR}/med/bin/med tx gov vote ${PROPOSAL_ID} yes \
  --from validator \
  --chain-id mycompany_chain_1 \
  --home ${BASE_DIR}/nodes/hub-nodes/node1
```

#### 4. Execute Upgrade

When block height reaches specified height:

```bash
# Stop old version (stop node when upgrade height reached)
docker-compose stop hub-node1

# Replace binary (switch to new version program)
mv ${BASE_DIR}/med/bin/med ${BASE_DIR}/med/bin/med-v1.0.0.bak  # Backup old version
mv ${BASE_DIR}/med/bin/med-v2.0.0 ${BASE_DIR}/med/bin/med      # Use new version

# Start new version (restart node to complete upgrade)
docker-compose start hub-node1
```

---

## FAQ

### 1. How to reset network?

```bash
# Stop all services (close all running nodes)
cd ${BASE_DIR}
docker-compose down

# Delete old data (clear all blockchain data, start over)
rm -rf ${BASE_DIR}/nodes

# Re-run deployment script (deploy new private network from scratch)
bash init-env.sh
```

### 2. How to add new validator?

```bash
# Generate keys on new node (create account for new validator)
${BASE_DIR}/med/bin/med keys add new-validator \
  --keyring-backend file \
  --home ${BASE_DIR}/nodes/hub-nodes/node-new

# Transfer from existing account (transfer to new validator for staking)
${BASE_DIR}/med/bin/med tx bank send \
  admin <new-validator-address> 200000000umec \
  --chain-id mycompany_chain_1 \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# Create validator (register new node as validator to participate in consensus)
${BASE_DIR}/med/bin/med tx staking create-validator \
  --amount 100000000umec \
  --pubkey $(${BASE_DIR}/med/bin/med tendermint show-validator \
    --home ${BASE_DIR}/nodes/hub-nodes/node-new) \
  --moniker "new-validator" \
  --commission-rate 0.1 \
  --commission-max-rate 0.2 \
  --commission-max-change-rate 0.01 \
  --min-self-delegation 1 \
  --from new-validator \
  --chain-id mycompany_chain_1 \
  --home ${BASE_DIR}/nodes/hub-nodes/node-new
```

### 3. How to modify block time?

Edit `config.toml`:

```toml
timeout_commit = "3s"  # 3 second blocks
```

Then restart all nodes.

### 4. How to view network status?

```bash
# View node status (get node running status and sync information)
${BASE_DIR}/med/bin/med status \
  --node tcp://localhost:26657

# View validator list (show all active validators in network)
${BASE_DIR}/med/bin/med query staking validators \
  --home ${BASE_DIR}/nodes/hub-nodes/node1

# View latest block (get latest block detailed information)
curl -s http://localhost:26657/block | jq .
```

---

## Security Best Practices

### 1. Key Management

- ✅ Use Hardware Security Module (HSM) to store validator keys
- ✅ Regularly rotate administrator keys
- ✅ Use multi-sig accounts for important operations
- ✅ Encrypt backups of all key files

### 2. Network Isolation

- ✅ Use firewall to restrict external access
- ✅ P2P port only open to internal network
- ✅ RPC/API access through VPN or reverse proxy
- ✅ Use TLS to encrypt communication

### 3. Access Control

- ✅ Implement principle of least privilege
- ✅ Enable audit logs
- ✅ Regularly review account permissions
- ✅ Use strong passwords and 2FA

### 4. Monitoring and Alerts

- ✅ Configure node health checks
- ✅ Set critical metric alerts
- ✅ Monitor abnormal transactions
- ✅ Regularly review logs

---

## Performance Benchmarking

### Test TPS

Use stress testing tool:

```bash
# Install bombardier (HTTP stress testing tool)
go install github.com/codesenberg/bombardier@latest

# Test REST API (100 concurrent connections, 10000 requests to test API performance)
bombardier -c 100 -n 10000 \
  http://localhost:1317/cosmos/bank/v1beta1/balances/<address>
```

### Test Transaction Throughput

```bash
# Batch send transactions
for i in {1..1000}; do
  ${BASE_DIR}/med/bin/med tx bank send \
    sender receiver 1umec \
    --chain-id mycompany_chain_1 \
    --fees 1000umec \
    --home ${BASE_DIR}/nodes/hub-nodes/node1 \
    --yes &
done
```

### Monitor Performance Metrics

- Block generation time
- Transaction confirmation latency
- Node memory usage
- Disk I/O

---

## Appendix

### A. Recommended Network Parameters

#### Development Environment

```json
{
  "timeout_commit": "1s",        // Block time: 1 second (fast block generation for development efficiency)
  "voting_period": "60s",        // Voting period: 1 minute (quick testing of governance process)
  "unbonding_time": "600s"       // Unbonding time: 10 minutes (quick verification of staking unbonding functionality)
}
```

#### Testing Environment

```json
{
  "timeout_commit": "3s",        // Block time: 3 seconds (balance performance and stability)
  "voting_period": "3600s",      // Voting period: 1 hour (simulate real scenarios, test governance mechanism)
  "unbonding_time": "86400s"     // Unbonding time: 24 hours (close to production environment, test security mechanisms)
}
```

#### Production Environment

```json
{
  "timeout_commit": "5s",        // Block time: 5 seconds (ensure network stability and decentralization)
  "voting_period": "604800s",    // Voting period: 7 days (sufficient time for community discussion and voting)
  "unbonding_time": "1814400s"   // Unbonding time: 21 days (prevent long-range attacks, ensure network security)
}
```

### B. Common Command Cheatsheet

```bash
# Create account
med keys add <name> --keyring-backend file

# Query balance
med query bank balances <address>

# Transfer
med tx bank send <from> <to> <amount>

# Create validator
med tx staking create-validator [flags]

# Query validators
med query staking validators

# Submit proposal
med tx gov submit-proposal [type] [flags]

# Vote
med tx gov vote <proposal-id> <option>

# Query proposals
med query gov proposals
```

---

## Summary

Private networks provide you with completely controllable blockchain environment, suitable for various development, testing, and enterprise application scenarios.

### Key Takeaways

- 🔒 Complete control over network parameters and access permissions
- 📊 Customize tokens and governance mechanisms as needed
- 🚀 Rapid iteration, zero-cost testing
- 🛡️ Implement strict security measures
- 📈 Continuously monitor and optimize performance

### Next Steps

- Deploy smart contracts
- Integrate applications
- Configure monitoring and alerts
- Optimize network performance
- Prepare production deployment

---

**Document Version**: v2.0.0  
**Applicable Script Version**: init-env.sh  
**Last Updated**: 2026-01-09  
**Maintainer**: Meta Earth Development Team

For questions, contact: support@mechain.io
