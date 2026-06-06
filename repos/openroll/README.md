
### Command Example


#### query the kyc-credential on rollApp
```sh
#command
rollappd q kyc list-kyc-credential --limit 3

#output
kYCCredential:
- credential:
    data: bWVfZWFydGg=
    did: "0000000000000001"
    hash: 536DD344E00C1194B7C08FAE4CCC8CDBA61AD6EA
    sid: kyc
    uri: http://baidu.com/XCDF1D
  did: "0000000000000001"
- credential:
    data: bWVfZWFydGg=
    did: "0000000000000002"
    hash: 536DD344E00C1194B7C08FAE4CCC8CDBA61AD6EA
    sid: kyc
    uri: http://baidu.com/XCDF1D
  did: "0000000000000002"
- credential:
    data: bWVfZWFydGg=
    did: "0000000000000003"
    hash: 536DD344E00C1194B7C08FAE4CCC8CDBA61AD6EA
    sid: kyc
    uri: http://baidu.com/XCDF1D
  did: "0000000000000003"
pagination:
  next_key: MDAwMDAwMDAwMDAwMDAwNC8=
  total: "0"
```

#### query the DID list on rollApp
1. `rollappd q kyc list-did `  Query Show All DID
2. `rollappd q kyc show-did [address]` show the DID of address
``` sh
# command
rollappd q kyc list-did --limit 3


#output
did:
- address: me10007wmcem8488qjqujx2x2xsn6484kagxm24pp
  did: "0000000000025405"
- address: me1002xgtumlw83ak3zkyr4h2eauhclngq0c2sj7f
  did: "0000000000016330"
- address: me1003uvch0r58dd2z58w35qqegyumnnqjstmr88z
  did: "0000000000012347"
pagination:
  next_key: Y29zbW9zMTAwNHptNXZyZms2MzNhYWRmMnhodXI4djQ4c3B2MHpyeWtkaGdkLw==
  total: "0"


```
## Developers guide


Project Structure

``` sh
.
├── app #director of app
├── cmd
│   └── rollappd # rollappd main file
├── docs
├── logger
├── proto # the protobuf file for modules
│   └── rollapp
│       └── kyc
├── scripts
├── sync
│   └── layer1 # sync kyc data from me-da
├── testutil
└── x
    └── kyc # KYC module which data sync from me-da
```

---

## Get Started: Manually Initialize and Run a Rollapp

This guide walks you through the complete process of manually initializing and launching a Rollapp from scratch, including chain initialization, dymint configuration, registering the rollapp and sequencer on me-hub, and starting the rollapp node.

---

### Prerequisites

1. **Binaries**: Prepare the compiled `rollappd` and `med`.
2. **me-hub private key**: Prepare an account on me-hub with sufficient balance (for gas and registration fees), and import the private key into a local keyring directory (e.g., `me-key/`).

---

### Step 1: Configure Parameters

Before running any commands, determine the following key parameters. They will be used throughout the entire process.

| Parameter | Example Value | Description |
|---|---|---|
| `ROLLAPP_CHAIN_ID` | `openroll_1-1` | Chain ID of the Rollapp |
| `ROLLAPP_CHAIN_DIR` | `.test/.rollapp` | Rollapp data directory |
| `KEY_NAME_ROLLAPP` | `roluser` | Local key name for the Rollapp node |
| `DENOM` | `urax` | Native token denomination of the Rollapp |
| `MONIKER` | `rolmoniker` | Node alias |
| `TOKEN_AMOUNT` | `1000000000000urax` | Token amount allocated to the genesis account |
| `STAKING_AMOUNT` | `500000000000urax` | Staking token amount |
| `MED_NODE_ADDR` | `tcp://127.0.0.1:36657` | me-hub node RPC address |
| `SETTLEMENT_NODE_ADDRESS` | `http://127.0.0.1:36657` | Settlement layer node address used by dymint (HTTP) |
| `DA_NODE_ADDRESS` | `http://<DA_NODE_IP>:36658` | DA layer node address |
| `FROM_KEY` | `user` | Key name on me-hub used to send registration transactions |
| `ME_KEYRING_PATH` | `me-key/` | Directory containing the me-hub key |

---

### Step 2: Initialize the Rollapp Node

#### 2.1 Initialize the chain

```bash
rollappd init <MONIKER> --chain-id <ROLLAPP_CHAIN_ID> --home <ROLLAPP_CHAIN_DIR>
```

Example:
```bash
rollappd init rolmoniker --chain-id openroll_1-1 --home .test/.rollapp
```

#### 2.2 Configure keyring and chain-id

```bash
rollappd config keyring-backend test --home .test/.rollapp
rollappd config chain-id openroll_1-1 --home .test/.rollapp
```

#### 2.3 Set minimum gas prices

Edit `.test/.rollapp/config/app.toml` and set:

```toml
minimum-gas-prices = "0urax"
```

#### 2.4 Set the token denomination in the genesis file

Edit `.test/.rollapp/config/genesis.json` and update the following fields:

```json
"app_state": {
  "staking": {
    "params": {
      "bond_denom": "urax"
    }
  },
  "gov": {
    "deposit_params": {
      "min_deposit": [
        { "denom": "urax", "amount": "..." }
      ]
    }
  }
}
```

#### 2.5 Create keys and add genesis accounts

```bash
# Create the node key
rollappd keys add roluser --keyring-backend test --home .test/.rollapp

# Add genesis account (allocate initial tokens)
rollappd add-genesis-account roluser 1000000000000urax --keyring-backend test --home .test/.rollapp

# Generate the sequencer gentx (bound to the dymint sequencer public key)
rollappd gentx_seq \
  --pubkey $(rollappd dymint show-sequencer --home .test/.rollapp) \
  --from roluser \
  --home .test/.rollapp

# Generate the validator genesis transaction
rollappd gentx roluser 500000000000urax \
  --chain-id openroll_1-1 \
  --keyring-backend test \
  --home .test/.rollapp

# Collect genesis transactions and validate
rollappd collect-gentxs --home .test/.rollapp
rollappd validate-genesis --home .test/.rollapp
```

---

### Step 3: Configure dymint.toml

Edit `.test/.rollapp/config/dymint.toml` to configure the settlement layer and DA layer connections:

```toml
settlement_layer = "me-hub"
settlement_node_address = "http://127.0.0.1:36657"
settlement_gas_prices = "10umec"

da_layer = "me-da"

# Block production timing
max_proof_time = "4s"
max_idle_time = "5s"

# DA layer connection config (JSON string)
da_config = '{"base_url":"http://<DA_NODE_IP>:36658","timeout":50000000000,"gas_prices":0.1,"auth_token":"TOKEN","backoff":{"initial_delay":6000000000,"max_delay":6000000000,"growth_factor":2},"retry_attempts":4,"retry_delay":3000000000}'
```

> **Note**: `da_config` is a JSON-formatted string. Replace `auth_token` with the actual authentication token of your DA node.

---

### Step 4: Configure client.toml

After initialization, write the rollapp node's sync key information into `client.toml` so that the dymint layer can communicate with the hub:

```bash
# Get the roluser address
ROLUSER_ADDRESS=$(rollappd keys show roluser -a --keyring-backend test --home .test/.rollapp)
```

Edit `.test/.rollapp/config/client.toml` and add or update the following fields:

```toml
sync-hub-key-name = "roluser"
sync-hub-key-address = "<ROLUSER_ADDRESS>"
```

---

### Step 5: Register the Rollapp on me-hub

Use an authorized account to send a `create-rollapp` transaction on me-hub to register the rollapp.

```bash
med tx rollapp create-rollapp openroll_1-1 5 '{"Addresses":[]}' \
  --from user \
  --keyring-backend test \
  --keyring-dir me-key/ \
  --fees 10000umec \
  --broadcast-mode sync \
  --yes \
  --node tcp://127.0.0.1:36657 \
  --chain-id mechain_100-1
```

> **Parameter notes**:
> - `5`: Maximum number of sequencers allowed for this rollapp.
> - `{"Addresses":[]}`: Sequencer whitelist (empty means no restriction).
> - `--from user`: The me-hub account sending the transaction; must have sufficient balance to cover gas.

---

### Step 6: Create a Sequencer Key and Fund It

The sequencer is responsible for producing blocks and submitting state to me-hub. It requires a dedicated me-hub account with sufficient balance.

#### 6.1 Create the sequencer key

```bash
# Create a dedicated keyring directory for the sequencer
mkdir -p .test/.rollapp/sequencer_keys/keyring-test

# Generate the sequencer key
med keys add sequencer \
  --keyring-dir .test/.rollapp/sequencer_keys \
  --keyring-backend test
```

#### 6.2 Query the sequencer address

```bash
SEQUENCER_ADDRESS=$(med keys show sequencer -a \
  --keyring-dir .test/.rollapp/sequencer_keys \
  --keyring-backend test)

echo "Sequencer Address: $SEQUENCER_ADDRESS"
```

#### 6.3 Transfer funds from the me-hub account to the sequencer

```bash
FROM_ADDRESS=$(med keys show user -a \
  --keyring-dir me-key/ \
  --keyring-backend test)

med tx bank send $FROM_ADDRESS $SEQUENCER_ADDRESS 100000000000umec \
  --from $FROM_ADDRESS \
  --keyring-dir me-key/ \
  --fees 5000umec \
  --node tcp://127.0.0.1:36657 \
  --chain-id mechain_100-1 \
  --keyring-backend test \
  --yes
```

---

### Step 7: Register the Sequencer on me-hub

Retrieve the sequencer public key generated by the rollapp node and submit a registration transaction to me-hub.

```bash
# Get the sequencer public key
SEQ_PUB_KEY=$(rollappd dymint show-sequencer --home .test/.rollapp)

# Register the sequencer
med tx sequencer create-sequencer \
  "$SEQ_PUB_KEY" \
  openroll_1-1 \
  '{"Moniker":"myrollapp-sequencer","Identity":"","Website":"","SecurityContact":"","Details":""}' \
  10mec \
  --from sequencer \
  --keyring-dir .test/.rollapp/sequencer_keys \
  --keyring-backend test \
  --broadcast-mode sync \
  --fees 10000umec \
  --yes \
  --node tcp://127.0.0.1:36657 \
  --chain-id mechain_100-1
```

> **Note**: The registration fee `10mec` will be deducted from the sequencer account. Make sure the fund transfer in the previous step has been confirmed.

---

### Step 8: Start the Rollapp Node

Once all configuration and registration steps are complete, start the rollapp node in the background:

```bash
nohup rollappd start --home .test/.rollapp > rollapp.log 2>&1 &
```

Monitor the startup logs:

```bash
tail -f rollapp.log
```

When the node is running normally, the logs should show continuously increasing block heights, indicating that block production is working correctly.

---

### Summary

The complete workflow is as follows:

```
Initialize the node (rollappd init)
    ↓
Configure keys and genesis file
    ↓
Configure dymint.toml (settlement layer + DA layer)
    ↓
Configure client.toml (hub sync key)
    ↓
Register rollapp on me-hub (med tx rollapp create-rollapp)
    ↓
Create sequencer key and fund it
    ↓
Register sequencer on me-hub (med tx sequencer create-sequencer)
    ↓
Start the node (rollappd start)
```

After the rollapp is running, the next step is to configure the relayer to establish an IBC channel between the rollapp and me-hub.
